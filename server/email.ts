import type { SendEmail } from '@cloudflare/workers-types';

import { isRecord } from '../src/lib/validation.ts';

export const codeLifetimeSeconds = 300;

export type CodeDelivery = (email: string, code: string) => Promise<void>;
export type AccountMail =
  { mode: 'test-mailbox' } | { mode: 'cloudflare'; deliver: CodeDelivery };

export class EmailDeliveryError extends Error {
  readonly limited: boolean;

  constructor(limited = false) {
    super(
      limited
        ? 'Too many code requests. Wait a moment and try again.'
        : 'We could not confirm that your code was sent. Check your inbox, then try again or change the email address.',
    );
    this.name = 'EmailDeliveryError';
    this.limited = limited;
  }
}

function codeMessage(from: string, email: string, code: string) {
  if (!from || /[\r\n<>]/.test(from) || !from.includes('@'))
    throw new Error('Configure MAIL_FROM with a verified sender address.');
  if (!/^\d{6}$/.test(code)) throw new EmailDeliveryError();
  return {
    from,
    to: email,
    subject: 'Your Quizmon sign-in code',
    text: `Your Quizmon sign-in code is ${code}. It expires in 5 minutes. If you did not request this code, you can ignore this email.`,
    html: `<p>Your Quizmon sign-in code is:</p><p><strong>${code}</strong></p><p>It expires in 5 minutes. If you did not request this code, you can ignore this email.</p>`,
  };
}

export function cloudflareBindingDelivery(
  binding: SendEmail,
  from: string,
): CodeDelivery {
  return async (email, code) => {
    try {
      const result = await binding.send(codeMessage(from, email, code));
      if (!result?.messageId) throw new EmailDeliveryError();
    } catch (error) {
      throw new EmailDeliveryError(
        isRecord(error) &&
          ['E_RATE_LIMIT_EXCEEDED', 'E_DAILY_LIMIT_EXCEEDED'].includes(
            String(error.code),
          ),
      );
    }
  };
}

export function cloudflareRestDelivery(
  config: { accountId: string; token: string; from: string },
  request: typeof fetch = fetch,
): CodeDelivery {
  if (!/^[a-f0-9]{32}$/i.test(config.accountId) || !config.token)
    throw new Error('Configure Cloudflare account ID and Email Sending token.');
  return async (email, code) => {
    try {
      const response = await request(
        `https://api.cloudflare.com/client/v4/accounts/${config.accountId}/email/sending/send`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${config.token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(codeMessage(config.from, email, code)),
          signal: AbortSignal.timeout(15_000),
        },
      );
      if (!response.ok) {
        await response.body?.cancel();
        throw new EmailDeliveryError(response.status === 429);
      }
      const body: unknown = await response.json();
      if (!isRecord(body) || body.success !== true || !isRecord(body.result))
        throw new EmailDeliveryError();
      const { delivered, queued, permanent_bounces: bounced } = body.result;
      if (
        !Array.isArray(delivered) ||
        !Array.isArray(queued) ||
        !Array.isArray(bounced) ||
        bounced.includes(email) ||
        (!delivered.includes(email) && !queued.includes(email))
      )
        throw new EmailDeliveryError();
    } catch (error) {
      throw error instanceof EmailDeliveryError
        ? error
        : new EmailDeliveryError();
    }
  };
}
