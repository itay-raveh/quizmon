import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Client } from 'pg';
import { createAccountApi } from '../../server/api.ts';
import { testDatabase, json } from './account-fixture.ts';

await test('joined session reads preserve expiry, revocation, and account deletion', async () => {
  const database = await testDatabase();
  const origin = 'http://localhost:4188';
  const api = createAccountApi({
    connectionString: database.connectionString,
    origin,
    secret: crypto.randomUUID() + crypto.randomUUID(),
    sync: { endpoint: 'http://localhost:8089', audience: 'quizmon' },
    mail: { mode: 'test-mailbox' },
  });
  // eslint-disable-next-line @typescript-eslint/unbound-method -- Called with Reflect.apply and the original client.
  const originalQuery = Client.prototype.query;
  try {
    const email = `${crypto.randomUUID()}@example.test`;
    const post = (path: string, body: object) =>
      api.request(origin + path, {
        method: 'POST',
        headers: { Origin: origin, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    assert.equal(
      (
        await post('/api/auth/email-otp/send-verification-otp', {
          email,
          type: 'sign-in',
        })
      ).status,
      200,
    );
    const mailbox = await json(
      await api.request(
        origin + `/api/dev/mailbox?email=${encodeURIComponent(email)}`,
      ),
    );
    const signedIn = await post('/api/auth/sign-in/email-otp', {
      email,
      otp: mailbox.code,
    });
    assert.equal(signedIn.status, 200);
    const cookie = signedIn.headers.get('set-cookie')!;
    assert.ok(cookie);
    const actor = await json(signedIn);
    const userId = (actor.user as { id: string }).id;
    const request = () =>
      api.request(origin + '/api/me', { headers: { Cookie: cookie } });
    let sessionReads = 0;
    let separateUserReads = 0;
    Client.prototype.query = function (this: Client, ...args: unknown[]) {
      const first = args[0];
      const text =
        typeof first === 'string'
          ? first
          : first && typeof first === 'object' && 'text' in first
            ? String(first.text)
            : '';
      if (/^select/i.test(text)) {
        if (text.includes('"session"')) sessionReads++;
        else if (text.includes('"user"')) separateUserReads++;
      }
      return Reflect.apply(originalQuery, this, args) as ReturnType<
        typeof originalQuery
      >;
    } as typeof originalQuery;
    assert.equal((await request()).status, 200);
    assert.equal(sessionReads, 1);
    assert.equal(separateUserReads, 0);
    Client.prototype.query = originalQuery;

    await database.pool.query(
      "UPDATE session SET expires_at = now() - interval '1 minute' WHERE user_id = $1",
      [userId],
    );
    assert.equal((await request()).status, 401);
    await database.pool.query(
      "UPDATE session SET expires_at = now() + interval '1 day' WHERE user_id = $1",
      [userId],
    );
    assert.equal((await request()).status, 401);

    const renewed = await post('/api/auth/email-otp/send-verification-otp', {
      email,
      type: 'sign-in',
    });
    assert.equal(renewed.status, 200);
    const newMailbox = await json(
      await api.request(
        origin + `/api/dev/mailbox?email=${encodeURIComponent(email)}`,
      ),
    );
    const newSession = await post('/api/auth/sign-in/email-otp', {
      email,
      otp: newMailbox.code,
    });
    const newCookie = newSession.headers.get('set-cookie')!;
    const renewedRequest = () =>
      api.request(origin + '/api/me', { headers: { Cookie: newCookie } });
    assert.equal((await renewedRequest()).status, 200);
    await database.pool.query('DELETE FROM session WHERE user_id = $1', [
      userId,
    ]);
    assert.equal((await renewedRequest()).status, 401);

    await post('/api/auth/email-otp/send-verification-otp', {
      email,
      type: 'sign-in',
    });
    const lastMailbox = await json(
      await api.request(
        origin + `/api/dev/mailbox?email=${encodeURIComponent(email)}`,
      ),
    );
    const lastSession = await post('/api/auth/sign-in/email-otp', {
      email,
      otp: lastMailbox.code,
    });
    await database.pool.query('DELETE FROM "user" WHERE id = $1', [userId]);
    assert.equal(
      (
        await api.request(origin + '/api/me', {
          headers: { Cookie: lastSession.headers.get('set-cookie')! },
        })
      ).status,
      401,
    );
  } finally {
    Client.prototype.query = originalQuery;
    await database.close();
  }
});
