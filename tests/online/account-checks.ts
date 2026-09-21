import assert from 'node:assert/strict';
import type { Pool } from 'pg';
import { exportAccount } from '../../server/account-export.ts';
import { action, completion } from './progress-fixtures.ts';
import {
  emptyContribution,
  hash,
  type Outcome,
} from '../../src/domain/sync/progress.ts';
import { isRecord } from '../../src/lib/validation.ts';

interface Actor {
  id: string;
  cookie: string;
}
type Request = (
  path: string,
  actor?: Actor,
  body?: unknown,
) => Promise<Response>;
async function json(response: Response) {
  assert.equal(response.status, 200, await response.clone().text());
  const value: unknown = await response.json();
  assert.ok(isRecord(value));
  return value;
}
export async function checkEmptyExport(
  request: Request,
  pool: Pool,
  actor: Actor,
) {
  assert.equal((await request('/api/account/export')).status, 401);
  const response = await request(
    '/api/account/export?accountId=someone-else',
    actor,
  );
  assert.match(response.headers.get('cache-control')!, /no-store/);
  assert.equal(
    response.headers.get('content-disposition'),
    'attachment; filename="quizmon-account.json"',
  );
  const value = await json(response);
  assert.equal(value.accountId, actor.id);
  assert.equal(value.state, null);
  assert.equal(value.generationId, null);
  for (const section of [
    'completionFacts',
    'dailyResults',
    'linkedDatasets',
    'friends',
  ])
    assert.deepEqual(value[section], []);
  for (const table of ['account_state', 'social_players'])
    assert.equal(
      (
        await pool.query<Record<string, unknown>>(
          `SELECT count(*)::int AS count FROM ${table} WHERE id=$1`,
          [actor.id],
        )
      ).rows[0]!.count,
      0,
    );
}

export async function checkAccountHistory(
  request: Request,
  pool: Pool,
  actors: Actor[],
  connectionString: string,
) {
  const [actor, other] = actors;
  assert.ok(actor && other);
  const state = await json(await request('/api/account', actor));
  assert.equal(typeof state.generationId, 'string');
  const generation = state.generationId as string;
  const datasetId = crypto.randomUUID();
  await json(
    await request('/api/account/link', actor, {
      expectedAccountId: actor.id,
      ...state,
      datasetId,
      linkId: crypto.randomUUID(),
      merge: true,
    }),
  );
  const send = (actions: unknown[], who = actor) =>
    request('/api/sync/operations', who, {
      expectedAccountId: who.id,
      serverEpoch: state.serverEpoch,
      actions,
    });
  const retained = action(datasetId, generation, 'discoveries.add', {
    pokemon: ['bulbasaur'],
  });
  retained.payloadVersion = 999;
  Object.assign(retained, { kind: 'retired.action' });
  const outcome: Outcome = {
    operationId: retained.operationId,
    requestHash: await hash(retained),
    revision: 0,
    code: 'recorded',
    status: 'accepted',
  };
  await pool.query<Record<string, unknown>>(
    'INSERT INTO operation_outcomes(id,owner_id,generation_id,operation_id,hash,outcome,effect) VALUES($1,$2,$3,$4,$5,$6,$7)',
    [
      crypto.randomUUID(),
      actor.id,
      generation,
      retained.operationId,
      outcome.requestHash,
      outcome,
      emptyContribution(),
    ],
  );
  const before = (
    await pool.query<Record<string, unknown>>(
      'SELECT progress,revision FROM account_state WHERE id=$1',
      [actor.id],
    )
  ).rows[0];
  const replay = await json(await send([retained]));
  assert.deepEqual(replay.outcomes, [outcome]);
  assert.deepEqual(
    (
      await pool.query<Record<string, unknown>>(
        'SELECT progress,revision FROM account_state WHERE id=$1',
        [actor.id],
      )
    ).rows[0],
    before,
  );
  const altered = await json(
    await send([{ ...retained, payload: { pokemon: ['ivysaur'] } }]),
  );
  assert.equal(
    (altered.outcomes as Outcome[])[0]!.code,
    'operation_id_conflict',
  );
  assert.equal(
    (await send([{ ...retained, operationId: crypto.randomUUID() }])).status,
    409,
  );
  assert.equal((await send([retained], other)).status, 409);

  const round = completion(datasetId);
  round.contentVersion = 999;
  round.result.contentVersion = 999;
  await pool.query<Record<string, unknown>>(
    `INSERT INTO completion_facts(id,owner_id,generation_id,completion_id,dataset_id,hash,mode,score_version,content_version,generator_version,contribution,eligible,revision,completion,completed_at,record_version,progress_version)
    VALUES($1,$2,$3,$4,$5,$6,'training',$7,$8,0,$9,true,0,$10,$11,1,$12)`,
    [
      crypto.randomUUID(),
      actor.id,
      generation,
      round.completionId,
      datasetId,
      await hash(round),
      round.scoreVersion,
      round.contentVersion,
      emptyContribution(),
      round,
      round.completedAt,
      round.progressVersion,
    ],
  );
  const completionRetry = await json(
    await send([action(datasetId, generation, 'completion.record', round)]),
  );
  assert.equal(
    (completionRetry.outcomes as Outcome[])[0]!.code,
    'already_recorded',
  );
  const conflict = await json(
    await send([
      action(datasetId, generation, 'completion.record', {
        ...round,
        completedAt: '2026-01-01T12:00:00.000Z',
      }),
    ]),
  );
  assert.equal(
    (conflict.outcomes as Outcome[])[0]!.code,
    'completion_id_conflict',
  );
  assert.equal(
    (
      await send([
        action(datasetId, generation, 'completion.record', {
          ...round,
          completionId: crypto.randomUUID(),
        }),
      ])
    ).status,
    409,
  );

  const response = await request(
    '/api/account/export?accountId=' + other.id,
    actor,
  );
  const exported = await json(response);
  assert.equal(exported.accountId, actor.id);
  assert.equal(exported.version, 1);
  assert.ok(isRecord(exported.account));
  assert.deepEqual(Object.keys(exported.account).sort(), [
    'created_at',
    'email',
    'friend_code',
    'id',
  ]);
  for (const name of [
    'completionFacts',
    'discoveries',
    'dailyResults',
    'trainingBests',
    'hallOfFame',
    'linkedDatasets',
    'operationOutcomes',
    'unresolvedIssues',
  ]) {
    assert.ok(Array.isArray(exported[name]));
    for (const row of exported[name] as unknown[])
      assert.ok(isRecord(row) && row.owner_id === actor.id);
  }
  assert.ok(Array.isArray(exported.friends));
  for (const relation of exported.friends) {
    assert.ok(isRecord(relation) && isRecord(relation.player));
    assert.deepEqual(Object.keys(relation.player).sort(), [
      'code',
      'id',
      'name',
      'partnerPokemon',
    ]);
  }
  const forbidden = [
    'session',
    'token',
    'accessToken',
    'refreshToken',
    'privateKey',
    'otp',
    'password',
  ];
  const inspect = (value: unknown) => {
    if (Array.isArray(value)) value.forEach(inspect);
    else if (isRecord(value))
      for (const [key, child] of Object.entries(value)) {
        assert.ok(!forbidden.includes(key));
        inspect(child);
      }
  };
  inspect(exported);
  const retainedRow = (
    exported.completionFacts as { hash: string; content_version: number }[]
  ).find((row) => row.content_version === 999);
  assert.equal(retainedRow?.hash, await hash(round));

  const named = new URL(connectionString);
  const applicationName = `export-check-${crypto.randomUUID()}`;
  named.searchParams.set('application_name', applicationName);
  const connectionCount = async () =>
    (
      await pool.query<Record<string, unknown>>(
        'SELECT count(*)::int AS count FROM pg_stat_activity WHERE application_name=$1',
        [applicationName],
      )
    ).rows[0]!.count as number;
  const waitClosed = async () => {
    for (let n = 0; n < 50 && (await connectionCount()); n++)
      await new Promise((r) => setTimeout(r, 20));
    assert.equal(await connectionCount(), 0);
  };
  await pool.query<Record<string, unknown>>(
    `INSERT INTO operation_outcomes(id,owner_id,generation_id,operation_id,hash,outcome,effect)
    SELECT gen_random_uuid(), $1, $2, gen_random_uuid(), 'batch-fixture', $3::jsonb, $4::jsonb FROM generate_series(1,225)`,
    [actor.id, generation, outcome, emptyContribution()],
  );
  const countBefore = (
    await pool.query<Record<string, unknown>>(
      'SELECT count(*)::int AS count FROM operation_outcomes WHERE owner_id=$1',
      [actor.id],
    )
  ).rows[0]!.count;
  const snapshotResponse = await exportAccount(
    named.toString(),
    actor.id,
    new AbortController().signal,
  );
  await pool.query<Record<string, unknown>>(
    `INSERT INTO operation_outcomes(id,owner_id,generation_id,operation_id,hash,outcome,effect)
    VALUES(gen_random_uuid(),$1,$2,gen_random_uuid(),'concurrent',$3,$4)`,
    [actor.id, generation, outcome, emptyContribution()],
  );
  const snapshotExport = await json(snapshotResponse);
  assert.equal(
    (snapshotExport.operationOutcomes as unknown[]).length,
    countBefore,
  );
  await waitClosed();

  const cancelled = await exportAccount(
    named.toString(),
    actor.id,
    new AbortController().signal,
  );
  const reader = cancelled.body!.getReader();
  assert.equal((await reader.read()).done, false);
  await reader.cancel();
  await waitClosed();

  const broken = await exportAccount(
    named.toString(),
    actor.id,
    new AbortController().signal,
  );
  const brokenReader = broken.body!.getReader();
  const initial = await brokenReader.read();
  let partial = new TextDecoder().decode(initial.value);
  await pool.query<Record<string, unknown>>(
    'SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE application_name=$1',
    [applicationName],
  );
  let failed = false;
  try {
    for (;;) {
      const chunk = await brokenReader.read();
      if (chunk.done) break;
      partial += new TextDecoder().decode(chunk.value);
    }
  } catch {
    failed = true;
  }
  assert.ok(failed);
  assert.throws(() => JSON.parse(partial));
  await waitClosed();
  return [
    'Retained unknown-version retries preserve ownership, hashes, and progress; unknown new work stays unacknowledged',
    'HTTP export isolates owners and public friend fields, preserves original metadata, and excludes credentials',
    'Real PostgreSQL export spans multiple batches in one snapshot, including concurrent writes, cancellation, and connection failure',
  ];
}
