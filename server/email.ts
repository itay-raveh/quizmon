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
    text: `Your Quizmon sign-in code is ${code}.\n\nEnter it in Quizmon within 5 minutes.\n\nIf you did not request this code, you can ignore this email.`,
    html: `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#72c3ee;color:#143149;font-family:'Gabarito Variable',Arial,Helvetica,sans-serif;">
  <span style="display:none;line-height:1px;color:#72c3ee;max-height:0;max-width:0;opacity:0;overflow:hidden;">Your Quizmon code expires in 5 minutes.</span>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="#72c3ee" style="border-collapse:collapse;background:#72c3ee;">
    <tr><td align="center" style="padding:32px 16px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:480px;border-collapse:separate;">
        <tr><td align="center" bgcolor="#fffbea" style="padding:32px 24px 36px;background:#fffbea;border:3px solid #083b7e;border-radius:12px;">
          <img src="https://quizmon.raveh.dev/assets/images/logo.png" alt="Quizmon" width="248" height="114" style="display:block;width:248px;max-width:100%;height:auto;margin:0 auto 24px;border:0;">
          <h1 style="margin:0 0 12px;color:#083b7e;font-size:28px;line-height:1.2;font-weight:800;">Your sign-in code</h1>
          <p style="margin:0 0 24px;color:#143149;font-size:16px;line-height:1.5;">Enter this code in Quizmon to sign in.</p>
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;">
            <tr><td align="center" bgcolor="#feec99" style="padding:18px 12px;background:#feec99;border:2px solid #083b7e;border-radius:8px;color:#083b7e;font-family:'Martian Mono Variable',Consolas,Monaco,monospace;font-size:28px;line-height:1.25;font-weight:800;letter-spacing:0.22em;">${code}</td></tr>
          </table>
          <p style="margin:16px 0 0;color:#446078;font-size:1rem;line-height:1.5;">Expires in 5 minutes.</p>
          <p style="margin:28px 0 0;color:#446078;font-size:1rem;line-height:1.5;">Didn’t request this code? You can ignore this email.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  };
}

export function cloudflareBindingDelivery(
  binding: SendEmail,
  from: string,
): CodeDelivery {
  return async (email, code) => {
    try {
      const result = await binding.send({
        ...codeMessage(from, email, code),
        from: { email: from, name: 'Quizmon' },
      });
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
          body: JSON.stringify({
            ...codeMessage(config.from, email, code),
            from: { address: config.from, name: 'Quizmon' },
          }),
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
