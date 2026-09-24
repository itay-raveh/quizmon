import { DurableObject } from 'cloudflare:workers';
import * as Sentry from '@sentry/cloudflare';
import webpush, { WebPushError } from 'web-push';
import { z } from 'zod';
import { site } from '../src/app/site';
import { getUtcDate } from '../src/domain/quiz/daily';
import {
  DAILY_REMINDER_MESSAGE,
  VAPID_PUBLIC_KEY,
} from '../src/features/reminders/reminder-config';
import { dailyDateSchema, isDailyDate, isRecord } from '../src/lib/validation';
import { getNextReminderAt } from './reminder-time';
import { noStoreResponse } from './responses';

const REMINDER_PATH =
  /^\/api\/daily-reminders\/([0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i;
const MAX_BODY_LENGTH = 8_192;
const STORAGE_KEY = 'daily-reminder';
const reminderMethods = ['PUT', 'PATCH', 'DELETE'];

const methodNotAllowed = (): Response =>
  noStoreResponse('Method not allowed', 405, {
    Allow: reminderMethods.join(', '),
  });

export interface DailyReminderEnv {
  DAILY_REMINDERS: {
    getByName(name: string): { fetch(request: Request): Promise<Response> };
  };
  VAPID_PRIVATE_KEY: string;
}

interface AlarmInvocationInfo {
  retryCount: number;
}

const key = (max: number) =>
  z
    .string()
    .min(1)
    .max(max)
    .regex(/^[A-Za-z0-9_-]+$/);
const registrationSchema = z.object({
  completedDate: dailyDateSchema.optional(),
  subscription: z.object({
    endpoint: z
      .url()
      .max(2_048)
      .refine((value) => new URL(value).protocol === 'https:'),
    expirationTime: z.number().nullable().optional(),
    keys: z.object({ auth: key(64), p256dh: key(256) }),
  }),
  timeZone: z
    .string()
    .max(100)
    .refine((value) => {
      try {
        new Intl.DateTimeFormat('en-US', { timeZone: value });
        return true;
      } catch {
        return false;
      }
    }),
});
type DailyReminderRegistration = z.infer<typeof registrationSchema>;

const readJson = async (request: Request): Promise<unknown> => {
  if (
    request.headers.get('Content-Type')?.split(';', 1)[0] !== 'application/json'
  ) {
    return null;
  }

  const contentLength = Number(request.headers.get('Content-Length') ?? 0);
  if (contentLength > MAX_BODY_LENGTH) return null;
  const reader = request.body?.getReader();
  if (!reader) return null;
  const bytes = new Uint8Array(MAX_BODY_LENGTH);
  let length = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (length + value.byteLength > MAX_BODY_LENGTH) {
      await reader.cancel();
      return null;
    }
    bytes.set(value, length);
    length += value.byteLength;
  }

  try {
    return JSON.parse(
      new TextDecoder('utf-8', { fatal: true }).decode(
        bytes.subarray(0, length),
      ),
    );
  } catch {
    return null;
  }
};

const parseRegistration = async (
  request: Request,
): Promise<DailyReminderRegistration | null> => {
  const parsed = registrationSchema.safeParse(await readJson(request));
  return parsed.success ? parsed.data : null;
};

export class DailyReminder extends DurableObject<DailyReminderEnv> {
  private async loadRegistration(): Promise<DailyReminderRegistration | null> {
    const stored = await this.ctx.storage.get(STORAGE_KEY);
    if (stored === undefined) return null;
    const parsed = registrationSchema.safeParse(stored);
    if (parsed.success) return parsed.data;
    await this.ctx.storage.deleteAll();
    return null;
  }

  async fetch(request: Request): Promise<Response> {
    if (request.method === 'DELETE') {
      await this.ctx.storage.deleteAll();
      return noStoreResponse(null, 204);
    }

    if (request.method === 'PATCH') {
      const body = await readJson(request);
      const completedDate = isRecord(body) ? body.completedDate : null;
      if (!isDailyDate(completedDate)) {
        return noStoreResponse('Invalid completion date', 400);
      }
      const current = await this.loadRegistration();
      if (current) {
        await this.ctx.storage.put(STORAGE_KEY, {
          ...current,
          completedDate,
        });
      }
      return noStoreResponse(null, 204);
    }

    if (request.method !== 'PUT') {
      return methodNotAllowed();
    }

    const registration = await parseRegistration(request);
    if (!registration) {
      return noStoreResponse('Invalid reminder', 400);
    }
    const current = await this.loadRegistration();
    await this.ctx.storage.put(STORAGE_KEY, {
      ...registration,
      completedDate: registration.completedDate ?? current?.completedDate,
    });
    await this.ctx.storage.setAlarm(getNextReminderAt(registration.timeZone));
    return noStoreResponse(null, 204);
  }

  async alarm(alarmInfo?: AlarmInvocationInfo): Promise<void> {
    const registration = await this.loadRegistration();
    if (!registration) return;

    const dailyDate = getUtcDate();
    if (registration.completedDate !== dailyDate) {
      try {
        await webpush.sendNotification(
          registration.subscription,
          JSON.stringify({
            ...DAILY_REMINDER_MESSAGE,
            url: `/daily/${dailyDate}?play=1`,
          }),
          {
            TTL: 43_200,
            topic: 'quizmon-daily',
            urgency: 'normal',
            vapidDetails: {
              privateKey: this.env.VAPID_PRIVATE_KEY,
              publicKey: VAPID_PUBLIC_KEY,
              subject: `mailto:${site.contactEmail}`,
            },
          },
        );
      } catch (error) {
        const statusCode = error instanceof WebPushError ? error.statusCode : 0;
        if (statusCode === 404 || statusCode === 410) {
          await this.ctx.storage.deleteAll();
          return;
        }
        if ((alarmInfo?.retryCount ?? 0) < 5) throw error;
        try {
          Sentry.captureException(error, {
            tags: { 'error.kind': 'reminder.delivery' },
          });
        } catch {
          // A failed report cannot change reminder scheduling.
        }
      }
    }

    await this.ctx.storage.setAlarm(
      getNextReminderAt(registration.timeZone, Date.now() + 60_000),
    );
  }
}

export const handleDailyReminderRequest = async (
  request: Request,
  env: DailyReminderEnv & { API_RATE_LIMIT: RateLimit },
  url: URL,
): Promise<Response | null> => {
  const match = REMINDER_PATH.exec(url.pathname);
  if (!match) return null;

  if (request.headers.get('Origin') !== url.origin) {
    return noStoreResponse('Forbidden', 403);
  }

  const id = match[1]!;
  if (!reminderMethods.includes(request.method)) {
    return methodNotAllowed();
  }

  if (request.method === 'PUT' && !env.VAPID_PRIVATE_KEY) {
    return noStoreResponse('Reminders unavailable', 503);
  }

  try {
    const result = await env.API_RATE_LIMIT.limit({
      key: request.headers.get('CF-Connecting-IP') ?? 'local',
    });
    if (!result.success)
      return noStoreResponse('Too many requests. Try again shortly.', 429, {
        'Retry-After': '60',
      });
  } catch {
    return noStoreResponse('Service temporarily unavailable.', 503);
  }

  return env.DAILY_REMINDERS.getByName(id).fetch(request);
};
