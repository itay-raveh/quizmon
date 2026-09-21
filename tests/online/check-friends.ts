import {
  accountRequest,
  json,
  migrationsFolder,
  signIn as authenticate,
  startAccountWorker,
  testDatabase,
} from './account-fixture.ts';
import { checkSourceRecovery } from './recovery-checks.ts';
import { checkEmptyExport, checkAccountHistory } from './account-checks.ts';
import assert from 'node:assert/strict';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { isRecord } from '../../src/lib/validation.ts';
import type { friendRequestView } from '../../server/friends.ts';
import { checkLeaderboards } from './leaderboard-checks.ts';
import {
  checkAccountNavigations,
  checkGameRoutes,
} from './game-worker-checks.ts';

type Relation = ReturnType<typeof friendRequestView>;
interface Actor {
  id: string;
  cookie: string;
}
const passed: string[] = [];
const database = await testDatabase();
const { container, connectionString, pool } = database;
let worker: Awaited<ReturnType<typeof startAccountWorker>> | undefined;
try {
  worker = await startAccountWorker({ connectionString });
  const base = worker.base;
  const trustedOrigin = worker.origin;
  const request = accountRequest(base, trustedOrigin);
  const signIn = () => authenticate(request);
  function relation(value: unknown): Relation {
    assert.ok(isRecord(value));
    assert.deepEqual(Object.keys(value).sort(), [
      'createdAt',
      'direction',
      'id',
      'peerId',
      'status',
      'updatedAt',
    ]);
    for (const entry of Object.values(value))
      assert.equal(typeof entry, 'string');
    return value as Relation;
  }
  async function mutation(response: Response) {
    assert.equal(response.status, 200, await response.clone().text());
    assert.equal(response.headers.get('Cache-Control'), 'no-store');
    return relation((await json(response)).request);
  }
  async function list(actor: Actor, path = '/api/friends') {
    const response = await request(path, actor);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('Cache-Control'), 'no-store');
    const value = await json(response);
    assert.equal(value.accountId, actor.id);
    assert.ok(Array.isArray(value.items));
    assert.ok(Array.isArray(value.players));
    for (const player of value.players) {
      assert.ok(isRecord(player));
      assert.deepEqual(Object.keys(player).sort(), [
        'code',
        'id',
        'name',
        'partnerPokemon',
      ]);
      assert.ok(
        value.items.some(
          (item: unknown) => isRecord(item) && item.peerId === player.id,
        ),
      );
    }
    assert.ok(
      value.nextCursor === null || typeof value.nextCursor === 'string',
    );
    return { items: value.items.map(relation), nextCursor: value.nextCursor };
  }
  const send = (
    from: Actor,
    to: Actor,
    requestId: string = crypto.randomUUID(),
  ) =>
    request('/api/friends/requests', from, {
      expectedAccountId: from.id,
      peerId: to.id,
      requestId,
    });
  const change = (
    actor: Actor,
    id: string,
    action: 'accept' | 'decline' | 'cancel' | 'remove',
  ) =>
    request(
      action === 'remove'
        ? `/api/friends/${id}/remove`
        : `/api/friends/requests/${id}/${action}`,
      actor,
      { expectedAccountId: actor.id },
    );
  assert.equal(
    (await json(await request('/api/account/config'))).emailDelivery,
    'test-mailbox',
  );
  {
    await checkGameRoutes(base);
    await checkAccountNavigations(base);
    passed.push(
      'Combined Worker serves built game assets, analytics, and reminder Durable Objects; account navigations stay authenticated API responses',
    );
  }
  assert.equal((await request('/api/friends')).status, 401);
  assert.equal(
    (await request('/api/friends/requests', undefined, {})).status,
    401,
  );
  const a = await signIn();
  await checkEmptyExport(request, pool, a);
  const b = await signIn();
  const c = await signIn();
  const d = await signIn();
  const e = await signIn();
  passed.push('Real local email-code sign-in and sessions through Workers');
  const identities = await Promise.all(
    Array.from({ length: 6 }, async () => {
      const response = await request('/api/friends/identity', a, {
        expectedAccountId: a.id,
      });
      assert.equal(response.status, 200);
      const value = await json(response);
      assert.ok(isRecord(value.player));
      return value.player;
    }),
  );
  const identity = identities[0]!;
  assert.ok(typeof identity.code === 'string');
  assert.match(identity.code, /^[A-F0-9]{16}$/);
  assert.ok(identities.every((player) => player.code === identity.code));
  assert.equal(identity.name, 'Trainer');
  assert.equal(identity.partnerPokemon, null);
  assert.equal(
    (await request(`/api/friends/player/${identity.code}`)).status,
    401,
  );
  assert.equal(
    (await request('/api/friends/identity', b, { expectedAccountId: a.id }))
      .status,
    403,
  );
  await request('/api/account', a);
  await pool.query('update account_state set edits=$1 where id=$2', [
    JSON.stringify({
      name: 'Test Trainer',
      partnerPokemon: 'bulbasaur',
      answerFlow: 'automatic',
    }),
    a.id,
  ]);
  const lookedUp = await json(
    await request(
      `/api/friends/player/${identity.code.toLowerCase().match(/.{4}/g)!.join('-')}`,
      b,
    ),
  );
  assert.deepEqual(lookedUp.player, {
    id: a.id,
    code: identity.code,
    name: 'Test Trainer',
    partnerPokemon: 'bulbasaur',
  });
  assert.equal(lookedUp.request, null);
  assert.equal((await request(`/api/trainers/${a.id}`)).status, 401);
  assert.equal((await request('/api/trainers/missing-player', b)).status, 404);
  const newTrainer = await json(await request(`/api/trainers/${b.id}`, a));
  assert.ok(isRecord(newTrainer.player));
  assert.ok(isRecord(newTrainer.record));
  assert.equal(newTrainer.player.id, b.id);
  assert.deepEqual(newTrainer.pokedex, []);
  assert.equal(newTrainer.record.pokedexFound, 0);
  const trainer = await json(await request(`/api/trainers/${a.id}`, b));
  assert.deepEqual(Object.keys(trainer).sort(), [
    'player',
    'pokedex',
    'profile',
    'record',
    'stats',
  ]);
  assert.deepEqual(trainer.player, lookedUp.player);
  assert.ok(isRecord(trainer.profile));
  assert.ok(isRecord(trainer.record));
  assert.equal(trainer.profile.name, 'Test Trainer');
  assert.equal(trainer.profile.partnerPokemon, 'bulbasaur');
  assert.equal(trainer.record.pokedexFound, 0);
  assert.deepEqual(trainer.pokedex, []);
  assert.ok(!JSON.stringify(trainer).includes('answerFlow'));
  assert.ok(!JSON.stringify(trainer).includes('email'));
  await pool.query(
    'insert into player_pokemon (id, owner_id, generation_id, pokemon, discovered, correct) select $1, id, generation_id, $2, true, true from account_state where id = $3',
    [crypto.randomUUID(), 'bulbasaur', a.id],
  );
  const discovered = await json(await request(`/api/trainers/${a.id}`, b));
  assert.ok(isRecord(discovered.record));
  assert.ok(isRecord(discovered.stats));
  assert.deepEqual(discovered.pokedex, ['bulbasaur']);
  assert.equal(discovered.record.pokedexFound, 1);
  assert.deepEqual(discovered.stats.pokedex, ['bulbasaur']);
  assert.equal(
    (await request(`/api/friends/player/${identity.code.slice(0, 4)}`, b))
      .status,
    400,
  );
  assert.equal(
    (await request('/api/friends/player/0000000000000000', b)).status,
    404,
  );
  passed.push(
    'Stable concurrent friend-code creation, exact lookup, and approved public profile fields',
  );
  const command = {
    expectedAccountId: a.id,
    peerId: b.id,
    requestId: crypto.randomUUID(),
  };
  assert.equal(
    (
      await request(
        '/api/friends/requests',
        a,
        command,
        'https://untrusted.example',
      )
    ).status,
    403,
  );
  const wrongAccount = await request('/api/friends/requests', a, {
    ...command,
    expectedAccountId: b.id,
  });
  assert.equal(wrongAccount.status, 403, await wrongAccount.text());
  assert.equal((await send(a, a)).status, 400);
  assert.equal((await send(a, { ...b, id: 'missing-player' })).status, 404);
  assert.equal(
    (
      await request('/api/friends/requests', a, {
        ...command,
        requestId: 'bad',
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await fetch(base + '/api/friends/requests', {
        method: 'POST',
        headers: {
          Cookie: a.cookie,
          Origin: trustedOrigin,
          'Content-Type': 'application/json',
        },
        body: '{',
      })
    ).status,
    400,
  );
  passed.push(
    'Anonymous access, origin, account switching, self requests, and malformed input',
  );
  const pending = await mutation(await send(a, b, command.requestId));
  assert.equal(pending.status, 'pending');
  assert.deepEqual(
    await mutation(await send(a, b, command.requestId)),
    pending,
  );
  assert.equal((await list(a)).items.length, 0);
  assert.equal(
    (await list(a, '/api/friends/requests?direction=outgoing')).items[0]?.id,
    pending.id,
  );
  assert.equal(
    (await list(b, '/api/friends/requests')).items[0]?.id,
    pending.id,
  );
  assert.equal((await list(c, '/api/friends/requests')).items.length, 0);
  for (const actor of [a, c])
    assert.equal((await change(actor, pending.id, 'accept')).status, 404);
  assert.equal((await change(b, pending.id, 'cancel')).status, 404);
  assert.equal((await change(c, pending.id, 'decline')).status, 404);
  assert.equal((await change(a, pending.id, 'remove')).status, 409);
  passed.push(
    'Pending visibility, exact retries, and recipient/sender permissions',
  );
  const accepted = await Promise.all(
    Array.from({ length: 6 }, async () =>
      mutation(await change(b, pending.id, 'accept')),
    ),
  );
  assert.ok(
    accepted.every(
      (row) =>
        row.status === 'accepted' && row.updatedAt === accepted[0]?.updatedAt,
    ),
  );
  assert.equal((await list(a)).items.length, 1);
  assert.equal((await list(a)).items[0]?.peerId, b.id);
  assert.equal((await list(b)).items[0]?.peerId, a.id);
  assert.equal(
    (
      await pool.query<{ count: number }>(
        "select count(*)::int as count from friend_requests where status='accepted'",
      )
    ).rows[0]?.count,
    1,
  );
  passed.push('Six simultaneous acceptances create one mutual friendship');
  const removed = await mutation(await change(a, pending.id, 'remove'));
  assert.equal(removed.status, 'removed');
  assert.deepEqual(
    await mutation(await change(a, pending.id, 'remove')),
    removed,
  );
  assert.equal((await change(b, pending.id, 'accept')).status, 409);
  assert.equal(
    (await mutation(await send(a, b, command.requestId))).status,
    'removed',
  );
  assert.equal((await list(a)).items.length, 0);
  const replacement = await mutation(await send(b, a));
  assert.equal(
    (await mutation(await change(a, pending.id, 'remove'))).status,
    'removed',
  );
  assert.equal(
    (await list(a, '/api/friends/requests')).items[0]?.id,
    replacement.id,
  );
  assert.equal((await change(b, pending.id, 'accept')).status, 409);
  await mutation(await change(a, replacement.id, 'accept'));
  const removeRace = await Promise.all([
    change(b, replacement.id, 'remove'),
    change(a, replacement.id, 'accept'),
  ]);
  assert.equal(removeRace[0]?.status, 200);
  assert.ok([200, 409].includes(removeRace[1].status));
  assert.equal((await list(a)).items.length, 0);
  passed.push(
    'Either-player removal, stale retries, replacement requests, and accept/remove race',
  );
  const crossed = await Promise.all(
    Array.from({ length: 6 }, (_, index) =>
      index % 2 ? send(d, e) : send(e, d),
    ),
  );
  const crossRows = await Promise.all(crossed.map(mutation));
  assert.equal(new Set(crossRows.map((row) => row.id)).size, 1);
  assert.ok(crossRows.every((row) => row.status === 'pending'));
  const cross = crossRows[0]!;
  const sender = cross.direction === 'outgoing' ? e : d;
  const receiver = sender.id === e.id ? d : e;
  const resolved = await Promise.all([
    change(sender, cross.id, 'cancel'),
    change(receiver, cross.id, 'decline'),
  ]);
  assert.deepEqual(resolved.map((r) => r.status).sort(), [200, 409]);
  assert.equal((await change(receiver, cross.id, 'accept')).status, 409);
  assert.equal((await list(d)).items.length, 0);
  assert.equal((await list(e, '/api/friends/requests')).items.length, 0);
  passed.push(
    'Concurrent crossed requests stay pending once; cancel/decline cannot later accept',
  );
  for (const peer of [c, d, e]) {
    const row = await mutation(await send(a, peer));
    await mutation(await change(peer, row.id, 'accept'));
  }
  const expected = (await list(a)).items.map((row) => row.id);
  const paged: string[] = [];
  let cursor: string | null = null;
  do {
    const result = await list(
      a,
      '/api/friends?limit=1' + (cursor ? `&after=${cursor}` : ''),
    );
    paged.push(...result.items.map((row) => row.id));
    cursor = result.nextCursor;
  } while (cursor);
  assert.deepEqual(paged, expected);
  assert.equal(expected.length, 3);
  assert.equal((await list(c)).items.length, 1);
  assert.equal((await list(c)).items[0]?.peerId, a.id);
  assert.equal((await list(b)).items.length, 0);
  assert.equal((await request('/api/friends?limit=101', a)).status, 400);
  assert.equal((await request('/api/friends?after=bad', a)).status, 400);
  assert.equal(
    (await request('/api/friends/requests?direction=all', a)).status,
    400,
  );
  assert.equal((await send(c, d, pending.id)).status, 409);
  passed.push(
    'Private paginated lists, explicit safe fields, and request-ID ownership',
  );
  const [low, high] = a.id < c.id ? [a.id, c.id] : [c.id, a.id];
  await assert.rejects(
    pool.query(
      'insert into friend_requests (id,user_low,user_high,sender_id) values ($1,$2,$3,$2)',
      [crypto.randomUUID(), low, high],
    ),
    (error: unknown) => isRecord(error) && error.code === '23505',
  );
  await assert.rejects(
    pool.query(
      'insert into friend_requests (id,user_low,user_high,sender_id) values ($1,$2,$2,$2)',
      [crypto.randomUUID(), a.id],
    ),
    (error: unknown) => isRecord(error) && error.code === '23514',
  );
  await assert.rejects(
    pool.query(
      'insert into friend_requests (id,user_low,user_high,sender_id) values ($1,$2,$3,$2)',
      [crypto.randomUUID(), high, low],
    ),
    (error: unknown) => isRecord(error) && error.code === '23514',
  );
  passed.push(...(await checkLeaderboards(request, pool, [a, b, c, d, e])));
  passed.push(
    ...(await checkAccountHistory(
      request,
      pool,
      [a, b, c, d, e],
      connectionString,
    )),
  );
  passed.push(
    await checkSourceRecovery(container, connectionString, a.id, pool),
  );
  await migrate(drizzle(pool), { migrationsFolder });
  assert.deepEqual(
    (await list(a)).items.map((row) => row.id),
    expected,
  );
  await pool.query('delete from "user" where id=$1', [c.id]);
  assert.equal((await request('/api/friends', c)).status, 401);
  assert.ok((await list(a)).items.every((row) => row.peerId !== c.id));
  assert.equal((await send(a, c)).status, 404);
  passed.push(
    'Database constraints, repeat migrations, and account-deletion cascades',
  );
  const postgres = (
    await pool.query<{ server_version: string }>('show server_version')
  ).rows[0];
  {
    await database.close();
    await checkGameRoutes(base);
    const unavailable = await fetch(base + '/api/account', {
      signal: AbortSignal.timeout(10_000),
    });
    assert.ok(unavailable.status >= 500);
    await unavailable.arrayBuffer();
    passed.push(
      'Game assets, analytics, and reminder operations still work with the account database stopped',
    );
  }
  console.log(
    JSON.stringify(
      {
        passed,
        postgres,
        runtime: 'combined game/account local workerd',
      },
      null,
      2,
    ),
  );
} finally {
  await worker?.close();
  await database.close();
}
