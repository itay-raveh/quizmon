import assert from 'node:assert/strict';
import { exportAccount } from '../../server/account-export.ts';
import { readBoard } from '../../server/read.ts';
import { drizzle } from 'drizzle-orm/node-postgres';
import { archiveCompletion } from '../../src/domain/sync/round-facts.ts';
import { completion } from './progress-fixtures.ts';
import {
  accountRequest,
  json,
  signIn,
  startAccountWorker,
  testDatabase,
} from './account-fixture.ts';
import {
  checkAccountNavigations,
  checkGameRoutes,
} from './game-worker-checks.ts';

const database = await testDatabase();
let worker: Awaited<ReturnType<typeof startAccountWorker>> | undefined;
try {
  worker = await startAccountWorker({
    connectionString: database.connectionString,
  });
  const request = accountRequest(worker.base, worker.origin);
  await checkGameRoutes(worker.base);
  await checkAccountNavigations(worker.base);
  const first = await signIn(request);
  const second = await signIn(request);
  const binding = await json(
    await request('/api/account', { cookie: first.cookie }),
  );
  const epoch = binding.serverEpoch as string;
  assert.equal(binding.id, first.id);
  const datasetId = crypto.randomUUID();
  const link = (cookie: string, owner: string, dataset: string) =>
    request(
      '/api/account/link',
      { cookie },
      {
        expectedAccountId: owner,
        serverEpoch: epoch,
        datasetId: dataset,
        merge: true,
      },
    );
  assert.equal((await link(first.cookie, first.id, datasetId)).status, 200);
  assert.equal(
    (await request('/api/account/export', { cookie: first.cookie })).status,
    200,
  );
  assert.equal((await link(second.cookie, second.id, datasetId)).status, 409);
  const send = (actions: unknown[], serverEpoch = epoch) =>
    request(
      '/api/sync/changes',
      { cookie: first.cookie },
      {
        expectedAccountId: first.id,
        serverEpoch,
        actions,
      },
    );
  const round = archiveCompletion(completion(datasetId));
  const { credited: _credited, ...upload } = round;
  void _credited;
  const action = { id: round.id, datasetId, kind: 'round', payload: upload };
  const accepted = await json(await send([action]));
  assert.deepEqual((accepted.outcomes as unknown[])[0], {
    id: round.id,
    status: 'accepted',
    credited: true,
  });
  assert.deepEqual(
    (await json(await send([action]))).outcomes,
    accepted.outcomes,
  );
  const changed = {
    ...action,
    payload: { ...upload, completed_at: '2026-09-11T11:00:00.000Z' },
  };
  assert.equal((await send([changed])).status, 409);
  const dayOne = archiveCompletion(
    completion(datasetId, 'daily', { discoveries: ['bulbasaur'] }),
  );
  const dayTwo = archiveCompletion(
    completion(datasetId, 'daily', { discoveries: ['ivysaur'] }),
  );
  const daily = (value: typeof dayOne) => {
    const { credited: _serverOnly, ...payload } = value;
    void _serverOnly;
    return { id: value.id, datasetId, kind: 'round', payload };
  };
  const dailies = await Promise.all([
    send([daily(dayOne)]),
    send([daily(dayTwo)]),
  ]);
  assert.deepEqual(
    dailies.map((response) => response.status),
    [200, 200],
  );
  const credited = await database.pool.query<{ count: string }>(
    "SELECT count(*)::text AS count FROM round WHERE player_id=$1 AND mode='daily' AND credited",
    [first.id],
  );
  assert.equal(credited.rows[0]?.count, '1');
  const replay = archiveCompletion(
    completion(datasetId, 'daily', { dailyDate: '2026-09-12' }),
    true,
    '2026-09-13',
  );
  assert.equal((await send([daily(replay)])).status, 200);
  assert.equal(
    (
      await readBoard(
        drizzle(database.pool),
        first.id,
        'daily',
        'global',
        0,
        20,
        replay.day!,
        replay.puzzle_id!,
      )
    ).total,
    0,
  );
  const friendship = crypto.randomUUID();
  await database.pool.query(
    'INSERT INTO friend(id,from_id,to_id) VALUES ($1,$2,$3)',
    [friendship, first.id, second.id],
  );
  await assert.rejects(
    database.pool.query(
      'INSERT INTO friend(id,from_id,to_id) VALUES ($1,$2,$3)',
      [crypto.randomUUID(), second.id, first.id],
    ),
    { code: '23505' },
  );
  await database.pool.query("UPDATE friend SET status='removed' WHERE id=$1", [
    friendship,
  ]);
  await database.pool.query(
    'INSERT INTO friend(id,from_id,to_id) VALUES ($1,$2,$3)',
    [crypto.randomUUID(), second.id, first.id],
  );
  const edit = (id: string, name: string) => ({
    id,
    datasetId,
    kind: 'edit',
    payload: { id, unit: 'name', value: name },
  });
  const earlier = edit(crypto.randomUUID(), 'Earlier');
  const later = edit(crypto.randomUUID(), 'Later');
  assert.equal((await send([earlier])).status, 200);
  assert.equal((await send([later])).status, 200);
  assert.equal((await send([earlier])).status, 200);
  const preference = (unit: string, value: unknown) => {
    const id = crypto.randomUUID();
    return { id, datasetId, kind: 'edit', payload: { id, unit, value } };
  };
  const training = {
    training_mode: 'custom',
    difficulty: 3,
    question_selection: 'custom',
    generations: ['I'],
    form_groups: ['standard'],
    question_types: ['type-check'],
    auto_types: null,
  };
  const malformed = await json(
    await send([
      preference('answer_flow', ['manual']),
      preference('training', { ...training, training_mode: ['custom'] }),
    ]),
  );
  assert.deepEqual(
    (malformed.outcomes as { status: string; reason: string }[]).map(
      ({ status, reason }) => [status, reason],
    ),
    [
      ['rejected', 'invalid_edit'],
      ['rejected', 'invalid_edit'],
    ],
  );
  const validPreferences = await json(
    await send([
      preference('answer_flow', 'auto'),
      preference('training', training),
    ]),
  );
  assert.deepEqual(
    (validPreferences.outcomes as { status: string }[]).map(
      ({ status }) => status,
    ),
    ['accepted', 'accepted'],
  );
  const [preferences] = (
    await database.pool.query<{
      answer_flow: string;
      training_mode: string;
    }>('SELECT answer_flow,training_mode FROM player WHERE id=$1', [first.id])
  ).rows;
  assert.deepEqual(preferences, {
    answer_flow: 'auto',
    training_mode: 'custom',
  });
  const player = await database.pool.query<{ name: string }>(
    'SELECT name FROM player WHERE id=$1',
    [first.id],
  );
  assert.equal(player.rows[0]?.name, 'Later');
  const conflictingRetry = {
    ...earlier,
    payload: { ...earlier.payload, value: 'Different' },
  };
  assert.equal((await send([conflictingRetry])).status, 409);
  assert.equal(
    (
      await database.pool.query<{ name: string }>(
        'SELECT name FROM player WHERE id=$1',
        [first.id],
      )
    ).rows[0]?.name,
    'Later',
  );
  const exported = await exportAccount(
    database.connectionString,
    first.id,
    new AbortController().signal,
  );
  const data = (await exported.json()) as Record<string, unknown>;
  assert.equal(data.version, 2);
  assert.equal((data.rounds as unknown[]).length, 4);
  assert.equal((data.operations as unknown[]).length, 6);
  await database.pool.query('UPDATE instance SET epoch=$1 WHERE id=1', [
    crypto.randomUUID(),
  ]);
  assert.equal((await send([edit(crypto.randomUUID(), 'Stale')])).status, 409);
  const persisted = await database.pool.query<{ name: string }>(
    'SELECT name FROM player WHERE id=$1',
    [first.id],
  );
  assert.equal(persisted.rows[0]?.name, 'Later');
  await database.pool.query('DELETE FROM "user" WHERE id=$1', [first.id]);
  const deleted = await database.pool.query<{ count: string }>(
    'SELECT count(*)::text AS count FROM round WHERE player_id=$1',
    [first.id],
  );
  assert.equal(deleted.rows[0]?.count, '0');
  process.stdout.write(
    'account API, Daily admission, historical replay, friend pair, retries, export, epoch fence, and cascade passed\n',
  );
} finally {
  await worker?.close();
  await database.close();
}
