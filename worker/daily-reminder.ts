import { DurableObject } from 'cloudflare:workers';
import webpush, {
  WebPushError,
  type PushSubscription as WebPushSubscription,
} from 'web-push';
import { site } from '../src/app/site';
import { VAPID_PUBLIC_KEY } from '../src/notifications/config';
import {
  dateFromParts,
  getNextReminderAt,
  getZonedDateParts,
} from './reminder-time';

const REMINDER_PATH =
  /^\/api\/daily-reminders\/([0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i;
const MAX_BODY_LENGTH = 8_192;
const STORAGE_KEY = 'daily-reminder';
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const NO_STORE_HEADERS = { 'Cache-Control': 'no-store' };

export interface DailyReminderEnv {
  DAILY_REMINDERS: {
    getByName(name: string): { fetch(request: Request): Promise<Response> };
  };
  VAPID_PRIVATE_KEY: string;
}

interface AlarmInvocationInfo {
  retryCount: number;
}

interface DailyReminderRegistration {
  completedDate?: string;
  subscription: WebPushSubscription;
  timeZone: string;
}

const isValidDailyDate = (value: unknown): value is string => {
  if (typeof value !== 'string' || !DATE_PATTERN.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return (
    !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value
  );
};

const isValidTimeZone = (value: unknown): value is string => {
  if (typeof value !== 'string' || value.length > 100) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
};

const isValidSubscription = (value: unknown): value is WebPushSubscription => {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<WebPushSubscription>;
  if (
    typeof candidate.endpoint !== 'string' ||
    candidate.endpoint.length > 2_048
  ) {
    return false;
  }
  try {
    if (new URL(candidate.endpoint).protocol !== 'https:') return false;
  } catch {
    return false;
  }

  const keys = candidate.keys as Record<string, unknown> | undefined;
  const base64Url = /^[A-Za-z0-9_-]+$/;
  return (
    Boolean(keys) &&
    typeof keys?.auth === 'string' &&
    typeof keys.p256dh === 'string' &&
    keys.auth.length <= 64 &&
    keys.p256dh.length <= 256 &&
    base64Url.test(keys.auth) &&
    base64Url.test(keys.p256dh)
  );
};

const readJson = async (request: Request): Promise<unknown> => {
  if (
    request.headers.get('Content-Type')?.split(';', 1)[0] !== 'application/json'
  ) {
    return null;
  }

  const contentLength = Number(request.headers.get('Content-Length') ?? 0);
  if (contentLength > MAX_BODY_LENGTH) return null;
  const text = await request.text();
  if (text.length > MAX_BODY_LENGTH) return null;

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
};

const parseRegistration = async (
  request: Request,
): Promise<DailyReminderRegistration | null> => {
  const value = await readJson(request);
  if (!value || typeof value !== 'object') return null;

  const candidate = value as Partial<DailyReminderRegistration>;
  if (
    !isValidTimeZone(candidate.timeZone) ||
    !isValidSubscription(candidate.subscription) ||
    (candidate.completedDate !== undefined &&
      !isValidDailyDate(candidate.completedDate))
  ) {
    return null;
  }
  return candidate as DailyReminderRegistration;
};

export class DailyReminder extends DurableObject<DailyReminderEnv> {
  async fetch(request: Request): Promise<Response> {
    if (request.method === 'DELETE') {
      await this.ctx.storage.deleteAlarm();
      await this.ctx.storage.deleteAll();
      return new Response(null, { headers: NO_STORE_HEADERS, status: 204 });
    }

    if (request.method === 'PATCH') {
      const body = await readJson(request);
      const completedDate =
        body && typeof body === 'object'
          ? (body as { completedDate?: unknown }).completedDate
          : null;
      if (!isValidDailyDate(completedDate)) {
        return new Response('Invalid completion date', {
          headers: NO_STORE_HEADERS,
          status: 400,
        });
      }
      const current =
        await this.ctx.storage.get<DailyReminderRegistration>(STORAGE_KEY);
      if (current) {
        await this.ctx.storage.put(STORAGE_KEY, {
          ...current,
          completedDate,
        });
      }
      return new Response(null, { headers: NO_STORE_HEADERS, status: 204 });
    }

    if (request.method !== 'PUT') {
      return new Response('Method not allowed', {
        headers: { ...NO_STORE_HEADERS, Allow: 'PUT, PATCH, DELETE' },
        status: 405,
      });
    }

    const registration = await parseRegistration(request);
    if (!registration) {
      return new Response('Invalid reminder', {
        headers: NO_STORE_HEADERS,
        status: 400,
      });
    }
    const current =
      await this.ctx.storage.get<DailyReminderRegistration>(STORAGE_KEY);
    await this.ctx.storage.put(STORAGE_KEY, {
      ...registration,
      completedDate: registration.completedDate ?? current?.completedDate,
    });
    await this.ctx.storage.setAlarm(getNextReminderAt(registration.timeZone));
    return new Response(null, { headers: NO_STORE_HEADERS, status: 204 });
  }

  async alarm(alarmInfo?: AlarmInvocationInfo): Promise<void> {
    const registration =
      await this.ctx.storage.get<DailyReminderRegistration>(STORAGE_KEY);
    if (!registration) return;

    const dailyDate = dateFromParts(
      getZonedDateParts(Date.now(), registration.timeZone),
    );
    if (registration.completedDate !== dailyDate) {
      try {
        await webpush.sendNotification(
          registration.subscription,
          JSON.stringify({
            body: 'Five questions are waiting.',
            tag: 'quizmon-daily',
            title: "Today's Daily is ready",
            url: `/?daily=${dailyDate}&play=1`,
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
      }
    }

    await this.ctx.storage.setAlarm(
      getNextReminderAt(registration.timeZone, Date.now() + 60_000),
    );
  }
}

export const handleDailyReminderRequest = async (
  request: Request,
  env: DailyReminderEnv,
  url: URL,
): Promise<Response | null> => {
  const match = REMINDER_PATH.exec(url.pathname);
  if (!match) return null;

  if (request.headers.get('Origin') !== url.origin) {
    return new Response('Forbidden', {
      headers: NO_STORE_HEADERS,
      status: 403,
    });
  }

  const id = match[1];
  if (!id) {
    return new Response('Invalid reminder', {
      headers: NO_STORE_HEADERS,
      status: 400,
    });
  }
  if (!['DELETE', 'PATCH', 'PUT'].includes(request.method)) {
    return new Response('Method not allowed', {
      headers: { ...NO_STORE_HEADERS, Allow: 'PUT, PATCH, DELETE' },
      status: 405,
    });
  }

  if (request.method === 'PUT' && !env.VAPID_PRIVATE_KEY) {
    return new Response('Reminders unavailable', {
      headers: NO_STORE_HEADERS,
      status: 503,
    });
  }

  return env.DAILY_REMINDERS.getByName(id).fetch(request);
};
