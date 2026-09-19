import assert from 'node:assert/strict';

export async function checkGameRoutes(base: string) {
  const navigation = { headers: { 'Sec-Fetch-Mode': 'navigate' } };
  const home = await fetch(base + '/', navigation);
  assert.equal(home.status, 200);
  assert.match(home.headers.get('Content-Type') ?? '', /text\/html/);
  const html = await home.text();
  assert.match(html, /Quizmon/);
  const script = /<script[^>]+src="([^"]+\.js)"/.exec(html)?.[1];
  assert.ok(script, 'Built game HTML must reference its JavaScript bundle.');
  const bundle = await fetch(new URL(script, base));
  assert.equal(bundle.status, 200);
  assert.match(bundle.headers.get('Content-Type') ?? '', /javascript/);
  await bundle.arrayBuffer();
  const missing = await fetch(base + '/missing-game-asset.txt');
  assert.equal(missing.status, 404);
  await missing.arrayBuffer();
  const sprite = await fetch(base + '/sprites/invalid.txt');
  assert.equal(sprite.status, 404);
  assert.equal(await sprite.text(), 'Sprite unavailable');
  const event = await fetch(base + '/api/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'page_view' }),
  });
  assert.equal(event.status, 204);
  const reminder = await fetch(
    base + '/api/daily-reminders/' + crypto.randomUUID(),
    { method: 'DELETE', headers: { Origin: base } },
  );
  assert.equal(reminder.status, 204);
  const forbiddenReminder = await fetch(
    base + '/api/daily-reminders/' + crypto.randomUUID(),
    { method: 'DELETE', headers: { Origin: 'https://untrusted.example' } },
  );
  assert.equal(forbiddenReminder.status, 403);
  await forbiddenReminder.arrayBuffer();
}

export async function checkAccountNavigations(base: string) {
  for (const path of [
    '/api/account/export',
    '/api/friends',
    '/api/leaderboards/daily',
  ]) {
    const response = await fetch(base + path, {
      headers: { 'Sec-Fetch-Mode': 'navigate', Accept: 'text/html' },
    });
    assert.equal(response.status, 401, path);
    assert.equal(response.headers.get('Cache-Control'), 'no-store', path);
    assert.doesNotMatch(await response.text(), /<!doctype html/i, path);
  }
}
