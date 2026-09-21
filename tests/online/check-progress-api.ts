import {
  accountRequest,
  json,
  signIn as authenticate,
  startAccountWorker,
  testDatabase,
} from './account-fixture.ts';
import { drizzle } from 'drizzle-orm/node-postgres';
import { bootstrap } from '../../server/progress-api.ts';
import { getTrainingScoreMultipliers } from '../../src/domain/quiz/score-multipliers.ts';
import { calculateScore } from '../../src/domain/quiz/scoring.ts';
import { QUESTION_RULES_VERSION } from '../../src/domain/quiz/question-variants.ts';
import assert from 'node:assert/strict';
import { isRecord } from '../../src/lib/validation.ts';
import {
  combine,
  emptyContribution,
  type Action,
  type Contribution,
  type Outcome,
} from '../../src/domain/sync/progress.ts';
import { action, completion } from './progress-fixtures.ts';

const database = await testDatabase();
const db = database.pool;
let worker: Awaited<ReturnType<typeof startAccountWorker>> | undefined;
try {
  worker = await startAccountWorker({
    connectionString: database.connectionString,
  });
  const base = worker.base;
  const send = accountRequest(base, worker.origin);
  const request = (path: string, cookie = '', body?: unknown) =>
    send(path, { cookie }, body);
  async function signIn(claim = true) {
    const { cookie } = await authenticate(send);
    const state = await json(await request('/api/account', cookie));
    assert.equal(typeof state.id, 'string');
    assert.equal(typeof state.generationId, 'string');
    assert.equal(typeof state.serverEpoch, 'string');
    const binding = {
      id: state.id as string,
      generationId: state.generationId as string,
      serverEpoch: state.serverEpoch as string,
      datasetId: crypto.randomUUID(),
      cookie,
    };
    if (claim)
      assert.equal(
        (
          await request('/api/account/link', cookie, {
            expectedAccountId: binding.id,
            generationId: binding.generationId,
            serverEpoch: binding.serverEpoch,
            datasetId: binding.datasetId,
            linkId: crypto.randomUUID(),
            merge: false,
          })
        ).status,
        200,
      );
    return binding;
  }
  type Actor = Awaited<ReturnType<typeof signIn>>;
  const upload = (
    actor: Actor,
    actions: Action[],
    expectedAccountId = actor.id,
  ) =>
    request('/api/sync/operations', actor.cookie, {
      expectedAccountId,
      serverEpoch: actor.serverEpoch,
      actions,
    });
  async function outcomes(response: Response): Promise<Outcome[]> {
    assert.equal(response.status, 200);
    const body = await json(response);
    assert.ok(Array.isArray(body.outcomes));
    return body.outcomes as Outcome[];
  }
  async function progress(owner: string) {
    const result = await db.query<{ progress: Contribution; revision: number }>(
      'SELECT progress,revision FROM account_state WHERE id=$1',
      [owner],
    );
    return result.rows[0]!;
  }
  const passed: string[] = [];
  assert.equal(
    (await json(await request('/api/account/config'))).emailDelivery,
    'test-mailbox',
    'Never send real email in regression checks.',
  );
  assert.equal((await request('/api/account')).status, 401);
  const first = await signIn();
  const other = await signIn(false);
  assert.equal(
    (
      await request('/api/account/import-baseline', first.cookie, {
        expectedAccountId: first.id,
        serverEpoch: first.serverEpoch,
      })
    ).status,
    404,
  );
  const a = (kind: Action['kind'], payload: unknown) =>
    action(first.datasetId, first.generationId, kind, payload);
  const round = completion(first.datasetId);
  const recorded = { ...a('completion.record', round), payloadVersion: 1 };
  const original = await outcomes(await upload(first, [recorded]));
  for (const retry of await Promise.all(
    Array.from({ length: 4 }, () => upload(first, [recorded])),
  ))
    assert.deepEqual(await outcomes(retry), original);
  assert.equal((await progress(first.id)).progress.rounds, 1);
  assert.equal(
    (await outcomes(await upload(first, [a('completion.record', round)])))[0]!
      .code,
    'already_recorded',
  );
  assert.equal(
    (
      await outcomes(
        await upload(first, [
          {
            ...recorded,
            payload: { ...round, completedAt: '2026-09-11T11:00:00.000Z' },
          },
        ]),
      )
    )[0]!.code,
    'operation_id_conflict',
  );
  assert.equal((await progress(first.id)).progress.rounds, 1);
  const reordered = structuredClone(round);
  reordered.training.generations.reverse();
  reordered.training.questionTypes.reverse();
  assert.equal(
    (
      await outcomes(await upload(first, [a('completion.record', reordered)]))
    )[0]!.code,
    'already_recorded',
  );
  passed.push('concurrent retries, completion deduplication, immutable hashes');
  assert.equal((await upload(other, [recorded], first.id)).status, 403);
  assert.equal(
    (await upload(other, [{ ...recorded, generationId: other.generationId }]))
      .status,
    409,
  );
  const claims = await Promise.all(
    Array.from({ length: 2 }, async () => {
      const datasetId = crypto.randomUUID();
      return json(
        await request('/api/account/link', other.cookie, {
          expectedAccountId: other.id,
          generationId: other.generationId,
          serverEpoch: other.serverEpoch,
          datasetId,
          linkId: datasetId,
          merge: false,
        }),
      );
    }),
  );
  assert.deepEqual(claims.map((claim) => claim.linked).sort(), [false, true]);
  passed.push('session ownership and dataset claims');

  assert.equal(
    (
      await outcomes(
        await upload(first, [
          a('completion.record', { completionId: crypto.randomUUID() }),
        ]),
      )
    )[0]!.status,
    'rejected',
  );
  const bad = completion(first.datasetId);
  bad.result.score++;
  const independent = await outcomes(
    await upload(first, [
      a('completion.record', bad),
      a('completion.record', completion(first.datasetId)),
    ]),
  );
  assert.deepEqual(
    independent.map((o) => o.status),
    ['rejected', 'accepted'],
  );
  assert.equal((await progress(first.id)).progress.rounds, 2);
  const unsupported = a('completion.record', completion(first.datasetId));
  unsupported.payloadVersion = 999;
  assert.equal((await upload(first, [unsupported])).status, 409);
  passed.push(
    'permanent rejection, independent valid work, unsupported-version pause',
  );

  const beforeDaily = (await progress(first.id)).progress;
  const dailies = [
    completion(first.datasetId, 'daily', { discoveries: ['ivysaur'] }),
    completion(first.datasetId, 'daily', { discoveries: ['venusaur'] }),
  ];
  const dailyOutcomes = await Promise.all(
    dailies.map(
      async (d) =>
        (await outcomes(await upload(first, [a('completion.record', d)])))[0]!,
    ),
  );
  assert.deepEqual(dailyOutcomes.map((o) => o.code).sort(), [
    'daily_already_recorded',
    'recorded',
  ]);
  const afterDaily = (await progress(first.id)).progress;
  assert.equal(afterDaily.rounds, beforeDaily.rounds + 1);
  assert.equal(afterDaily.correctAnswers, beforeDaily.correctAnswers + 5);
  const pokemon = await db.query<{ pokemon: string }>(
    'SELECT pokemon FROM player_pokemon WHERE owner_id=$1 AND discovered',
    [first.id],
  );
  assert.ok(
    ['ivysaur', 'venusaur'].every((key) =>
      pokemon.rows.some((row) => row.pokemon === key),
    ),
  );
  const midnight = completion(first.datasetId, 'daily', {
    dailyDate: '2026-09-10',
    completedAt: '2026-09-11T00:01:00.000Z',
  });
  await outcomes(await upload(first, [a('completion.record', midnight)]));
  const credit = await db.query<{ date: string; streak_credit: boolean }>(
    'SELECT date,streak_credit FROM daily_results WHERE owner_id=$1 ORDER BY date',
    [first.id],
  );
  assert.deepEqual(
    credit.rows.map((r) => r.streak_credit),
    [false, true],
  );
  passed.push(
    'concurrent Daily first acceptance, discovery union, UTC streak dates',
  );

  const beforeLeague = (await progress(first.id)).progress;
  await outcomes(
    await upload(first, [
      a(
        'completion.record',
        completion(first.datasetId, 'league', { failedLeague: true }),
      ),
    ]),
  );
  assert.equal(
    (await progress(first.id)).progress.correctAnswers,
    beforeLeague.correctAnswers + 2,
  );
  assert.equal((await progress(first.id)).progress.leagueCompleted, false);
  await outcomes(
    await upload(first, [
      a('completion.record', completion(first.datasetId, 'league')),
    ]),
  );
  assert.equal((await progress(first.id)).progress.leagueCompleted, true);
  const hall = (await json(await request('/api/account/export', first.cookie)))
    .hallOfFame;
  assert.ok(Array.isArray(hall));
  assert.deepEqual(
    hall.map((row: unknown) => {
      assert.ok(isRecord(row));
      return row.trainer_name;
    }),
    ['Pilot Trainer'],
  );
  passed.push('early League failure and immutable Hall of Fame');

  const edit = a('profile.patch', {
    unit: 'name',
    value: 'First',
    expectedRevision: 0,
  });
  const [edited] = await outcomes(await upload(first, [edit]));
  const follow = a('profile.patch', {
    unit: 'name',
    value: 'Second',
    expectedRevision: 0,
    predecessorId: edit.operationId,
  });
  assert.equal(
    (await outcomes(await upload(first, [follow])))[0]!.status,
    'accepted',
  );
  const conflict = a('profile.patch', {
    unit: 'name',
    value: 'Stale',
    expectedRevision: edited!.unitRevision,
  });
  assert.equal(
    (await outcomes(await upload(first, [conflict])))[0]!.status,
    'conflict',
  );
  const descendant = a('profile.patch', {
    unit: 'name',
    value: 'Also stale',
    expectedRevision: 0,
    predecessorId: conflict.operationId,
  });
  assert.equal(
    (await outcomes(await upload(first, [descendant])))[0]!.status,
    'conflict',
  );
  assert.equal(
    (
      await outcomes(
        await upload(first, [
          a('profile.patch', {
            unit: 'avatar',
            value: 'leaf-gen3',
            expectedRevision: 0,
          }),
        ]),
      )
    )[0]!.status,
    'accepted',
  );
  assert.equal(
    (
      await outcomes(
        await upload(first, [
          a('profile.patch', {
            unit: 'avatar',
            value: 'unknown-sprite',
            expectedRevision: 1,
          }),
        ]),
      )
    )[0]!.code,
    'invalid_edit',
  );
  assert.equal(
    (
      await outcomes(
        await upload(first, [
          a('preferences.patch', {
            unit: 'answerFlow',
            value: 'instant',
            expectedRevision: 0,
          }),
        ]),
      )
    )[0]!.status,
    'accepted',
  );
  const profile = await db.query<{ edits: Record<string, unknown> }>(
    'SELECT edits FROM account_state WHERE id=$1',
    [first.id],
  );
  assert.equal(profile.rows[0]!.edits.name, 'Second');
  assert.equal(profile.rows[0]!.edits.avatar, 'leaf-gen3');
  passed.push(
    'successive edits, conflicting descendants, independent preference units',
  );

  await outcomes(
    await upload(first, [a('discoveries.add', { pokemon: ['charmander'] })]),
  );
  const facts = await db.query<{ contribution: Contribution }>(
    'SELECT contribution FROM completion_facts WHERE owner_id=$1',
    [first.id],
  );
  const effects = await db.query<{ effect: Contribution }>(
    'SELECT effect FROM operation_outcomes WHERE owner_id=$1',
    [first.id],
  );
  const rebuilt = [
    ...facts.rows.map((f) => f.contribution),
    ...effects.rows.map((e) => e.effect),
  ].reduce(combine, emptyContribution());
  const storedProgress = (await progress(first.id)).progress;
  assert.deepEqual(
    { ...rebuilt, discoveries: [], correctPokemon: [] },
    storedProgress,
  );
  assert.ok(rebuilt.discoveries.includes('charmander'));
  assert.equal(
    (
      await db.query(
        "SELECT column_name FROM information_schema.columns WHERE table_name='completion_facts' AND column_name = 'completion'",
      )
    ).rowCount,
    1,
  );
  const retainedGames = (
    await db.query(
      'SELECT completion FROM completion_facts WHERE owner_id=$1 ORDER BY revision',
      [first.id],
    )
  ).rows;
  assert.ok(retainedGames.length > 0);
  await db.query("UPDATE account_state SET progress='{}' WHERE id=$1", [
    first.id,
  ]);
  await db.query('UPDATE account_state SET projection_version=0 WHERE id=$1', [
    first.id,
  ]);
  const rebuiltAccount = await bootstrap(drizzle(db), first.id);
  assert.deepEqual(rebuiltAccount.account.progress, storedProgress);
  assert.equal(rebuiltAccount.account.projectionVersion, 1);
  assert.deepEqual(
    (
      await db.query(
        'SELECT completion FROM completion_facts WHERE owner_id=$1 ORDER BY revision',
        [first.id],
      )
    ).rows,
    retainedGames,
  );
  const rebuiltExport = await json(
    await request('/api/account/export', first.cookie),
  );
  assert.ok(
    Array.isArray(rebuiltExport.trainingBests) &&
      rebuiltExport.trainingBests.length > 0,
  );
  passed.push(
    'raw-record rebuild after corrupted aggregates without rewriting recorded games',
  );

  const replay = await upload({ ...first, serverEpoch: crypto.randomUUID() }, [
    a('discoveries.add', { pokemon: ['squirtle'] }),
  ]);
  assert.equal(replay.status, 409);
  assert.equal(
    (
      await upload(first, [
        {
          ...a('discoveries.add', { pokemon: ['squirtle'] }),
          generationId: crypto.randomUUID(),
        },
      ])
    ).status,
    409,
  );
  const published = await db.query<{ tablename: string }>(
    "SELECT tablename FROM pg_publication_tables WHERE pubname='powersync'",
  );
  assert.ok(
    published.rows.every(({ tablename }) =>
      [
        'account_state',
        'completion_facts',
        'player_pokemon',
        'sync_issues',
      ].includes(tablename),
    ),
  );
  passed.push('epoch/generation fencing and private publication boundary');
  const assisted = await signIn();
  const assistedRound = completion(assisted.datasetId, 'daily', {
    assistsUsed: 4,
  });
  assert.equal(
    (
      await outcomes(
        await upload(assisted, [
          action(
            assisted.datasetId,
            assisted.generationId,
            'completion.record',
            assistedRound,
          ),
        ]),
      )
    )[0]!.status,
    'accepted',
  );
  assert.equal((await progress(assisted.id)).progress.rounds, 1);
  assert.equal(
    (await progress(assisted.id)).progress.championAnswersWithoutClues,
    0,
  );
  passed.push('Champion completion with choices and all three clues');
  const levels = await signIn();
  for (const difficulty of [1, 5] as const) {
    const round = completion(levels.datasetId);
    round.training = {
      ...round.training,
      difficulty,
      formGroups: ['standard'],
      questionSelection: 'custom',
      questionTypes: ['type-check'],
    };
    round.result.rules = {
      version: QUESTION_RULES_VERSION,
      difficulty,
      formGroups: ['standard'],
      generations: [...round.training.generations],
      questionTypes: ['type-check'],
    };
    round.result.scoreMultipliers = getTrainingScoreMultipliers(round.training);
    round.scoreVersion = round.result.scoreVersion = 3;
    round.result.score = calculateScore(
      round.result.answers,
      round.result.scoreMultipliers,
    );
    const recorded = action(
      levels.datasetId,
      levels.generationId,
      'completion.record',
      round,
    );
    assert.equal(
      (await outcomes(await upload(levels, [recorded])))[0]!.status,
      'accepted',
    );
  }
  const bests = (
    await json(await request('/api/account/export', levels.cookie))
  ).trainingBests;
  assert.ok(Array.isArray(bests));
  assert.deepEqual(
    bests
      .map((row: unknown) => {
        assert.ok(
          isRecord(row) && isRecord(row.result) && isRecord(row.result.rules),
        );
        return row.result.rules.difficulty;
      })
      .sort(),
    [5],
  );
  assert.equal((await progress(levels.id)).progress.masteryRounds, 0);
  assert.equal((await progress(levels.id)).progress.quickAttackRounds, 0);
  passed.push(
    'weighted Training shares one best across difficulties and preserves custom qualification',
  );
  const collector = await signIn();
  const collectorAction = (kind: Action['kind'], payload: unknown) =>
    action(collector.datasetId, collector.generationId, kind, payload);
  const equipItem = () =>
    collectorAction('profile.patch', {
      unit: 'specialty',
      value: 'item',
      expectedRevision: 0,
    });
  assert.equal(
    (await outcomes(await upload(collector, [equipItem()])))[0]!.code,
    'specialty_not_earned',
  );
  const items = completion(collector.datasetId, 'training', {
    discoveries: [],
  });
  items.training.questionSelection = 'custom';
  items.training.questionTypes = ['item-identification'];
  items.result.rules!.questionTypes = ['item-identification'];
  items.result.answers = items.result.answers.map((answer) => ({
    ...answer,
    category: 'knowledge',
    questionType: 'item-identification',
    subject: { kind: 'item', name: 'potion', generation: 'I' },
    observation: {
      ...answer.observation!,
      options: ['potion', 'antidote'],
      selected: ['potion'],
      expected: ['potion'],
    },
  }));
  items.result.scoreMultipliers = getTrainingScoreMultipliers(
    items.result.rules!,
  );
  items.result.score = calculateScore(
    items.result.answers,
    items.result.scoreMultipliers,
  );
  assert.equal(
    (
      await outcomes(
        await upload(collector, [collectorAction('completion.record', items)]),
      )
    )[0]!.status,
    'accepted',
  );
  assert.equal(
    (await outcomes(await upload(collector, [equipItem()])))[0]!.status,
    'accepted',
  );
  const equipped = await db.query<{ edits: { specialty: string } }>(
    'SELECT edits FROM account_state WHERE id=$1',
    [collector.id],
  );
  assert.equal(equipped.rows[0]!.edits.specialty, 'item');
  passed.push(
    'Item Specialist requires earned format progress before equipping',
  );
  console.log(JSON.stringify({ api: base, passed }, null, 2));
} finally {
  await worker?.close();
  await database.close();
}
