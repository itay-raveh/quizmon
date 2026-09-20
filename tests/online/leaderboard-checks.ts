import { dailyDefinition } from '../../src/domain/quiz/daily-definition.ts';
import assert from 'node:assert/strict';
import type { Pool } from 'pg';
import { formGroups } from '../../src/domain/pokemon/types.ts';
import {
  calculateScore,
  getResponseTime,
  getSpeedBonusPoints,
} from '../../src/domain/quiz/scoring.ts';
import type {
  DailyLeaderboard,
  Leaderboard,
} from '../../src/domain/social/leaderboards.ts';
import { SCORE_VERSION } from '../../src/domain/quiz/scoring.ts';
import { isRecord } from '../../src/lib/validation.ts';
import { action, completion } from './progress-fixtures.ts';

interface Actor {
  id: string;
  cookie: string;
}
type Request = (
  path: string,
  actor?: Actor,
  body?: unknown,
) => Promise<Response>;

export async function checkLeaderboards(
  request: Request,
  pool: Pool,
  actors: Actor[],
) {
  const [a, b, c, d, e] = actors;
  assert.ok(a && b && c && d && e);
  const today = new Date().toISOString().slice(0, 10);
  const lastWeek = new Date(Date.now() - 7 * 86_400_000)
    .toISOString()
    .slice(0, 10);
  async function upload(
    actor: Actor,
    date: string,
    time: number,
    completedAt = `${date}T12:00:00.000Z`,
    mode: 'daily' | 'training' = 'daily',
  ) {
    const response = await request('/api/account', actor);
    const state: unknown = await response.json();
    assert.ok(isRecord(state) && typeof state.generationId === 'string');
    const datasetId = crypto.randomUUID();
    assert.equal(
      (
        await request('/api/account/link', actor, {
          expectedAccountId: actor.id,
          ...state,
          datasetId,
          linkId: datasetId,
          merge: true,
        })
      ).status,
      200,
    );
    const round = completion(datasetId, mode, {
      dailyDate: date,
      completedAt,
    });
    const revision = dailyDefinition;
    round.scoreVersion = revision.score;
    if (mode === 'daily') round.generatorVersion = revision.generator;
    round.result.scoreVersion = revision.score;
    if (mode === 'daily')
      round.training = {
        ...round.training,
        difficulty: 3,
        formGroups: [...formGroups],
      };
    if (mode === 'daily')
      round.result.rules = {
        version: revision.rules,
        difficulty: 3,
        formGroups: [...formGroups],
        generations: [...round.training.generations],
        questionTypes: [...round.training.questionTypes],
      };
    if (mode === 'daily')
      round.result.dailyTrack = { difficulty: 3, scope: 'all' };
    round.result.answers = round.result.answers.map((answer) => ({
      ...answer,
      responseMilliseconds: time,
      speedBonus: getSpeedBonusPoints(answer.points, time),
      ...(answer.questionType === 'champion' ? { unassistedSearch: true } : {}),
    }));
    Object.assign(round.result, getResponseTime(round.result.answers), {
      score: calculateScore(
        round.result.answers,
        round.result.scoreMultipliers,
      ),
    });
    const operation = action(
      datasetId,
      state.generationId,
      'completion.record',
      round,
    );
    const post = () =>
      request('/api/sync/operations', actor, {
        expectedAccountId: actor.id,
        serverEpoch: state.serverEpoch,
        actions: [operation],
      });
    const result = await post();
    assert.equal(result.status, 200, await result.clone().text());
    const value: unknown = await result.json();
    assert.ok(isRecord(value) && Array.isArray(value.outcomes));
    const outcome: unknown = value.outcomes[0];
    assert.ok(isRecord(outcome));
    assert.notEqual(outcome.status, 'rejected', JSON.stringify(value));
    assert.equal((await post()).status, 200);
  }
  async function board(
    actor: Actor,
    scope = 'friends',
    query = '',
    date = today,
  ): Promise<DailyLeaderboard> {
    const response = await request(
      `/api/leaderboards/daily?date=${date}&scope=${scope}${query}`,
      actor,
    );
    assert.equal(response.status, 200, await response.clone().text());
    assert.equal(response.headers.get('cache-control'), 'no-store');
    const value = (await response.json()) as DailyLeaderboard;
    assert.deepEqual(Object.keys(value).sort(), [
      'accountId',
      'checkedAt',
      'date',
      'items',
      'nextCursor',
      'scope',
      'total',
      'viewer',
    ]);
    assert.equal(value.accountId, actor.id);
    for (const row of [
      ...value.items,
      ...(value.viewer ? [value.viewer] : []),
    ]) {
      assert.deepEqual(Object.keys(row).sort(), [
        'elapsedMilliseconds',
        'player',
        'rank',
        'score',
      ]);
      assert.deepEqual(Object.keys(row.player).sort(), [
        'code',
        'id',
        'name',
        'partnerPokemon',
      ]);
      assert.equal(typeof row.rank, 'number');
    }
    return value;
  }
  assert.equal((await request('/api/leaderboards/daily')).status, 401);
  assert.equal((await board(b)).total, 0);
  for (const query of [
    'scope=other',
    'date=garbage',
    'date=2999-01-01',
    'limit=101',
    'after=-1',
  ])
    assert.equal(
      (await request(`/api/leaderboards/daily?${query}`, a)).status,
      400,
    );
  await upload(a, today, 1000);
  await upload(b, today, 10);
  await upload(c, today, 1000);
  await upload(d, today, 1001);
  await upload(e, today, 1000, `${lastWeek}T12:00:00.000Z`);
  const friends = await board(a);
  assert.equal(friends.total, 3);
  assert.deepEqual(
    friends.items.map((row) => row.rank),
    [1, 1, 3],
  );
  assert.equal(friends.viewer?.rank, 1);
  assert.ok(
    friends.items.every(
      (row) => row.player.id !== b.id && row.player.id !== e.id,
    ),
  );
  const global = await board(a, 'global', '&limit=1');
  assert.equal(global.total, 4);
  assert.equal(global.items[0]!.player.id, b.id);
  assert.equal(global.viewer!.rank, 2);
  let cursor: string | null = null;
  const ids: string[] = [];
  do {
    const page = await board(
      a,
      'global',
      '&limit=1' + (cursor ? `&after=${cursor}` : ''),
    );
    ids.push(...page.items.map((row) => row.player.id));
    cursor = page.nextCursor;
  } while (cursor);
  assert.equal(new Set(ids).size, 4);
  assert.deepEqual(new Set(ids), new Set([a.id, b.id, c.id, d.id]));
  assert.equal((await board(b)).total, 1);
  await upload(a, today, 1);
  assert.equal((await board(a)).viewer!.score, friends.viewer.score);
  await upload(a, lastWeek, 1000);
  assert.equal((await board(a, 'global', '', lastWeek)).viewer?.rank, 1);

  const requestId = crypto.randomUUID();
  assert.equal(
    (
      await request('/api/friends/requests', b, {
        expectedAccountId: b.id,
        peerId: a.id,
        requestId,
      })
    ).status,
    200,
  );
  assert.equal((await board(a)).total, 3);
  assert.equal(
    (
      await request(`/api/friends/requests/${requestId}/accept`, a, {
        expectedAccountId: a.id,
      })
    ).status,
    200,
  );
  assert.equal((await board(a)).viewer!.rank, 2);
  assert.equal(
    (
      await request(`/api/friends/${requestId}/remove`, b, {
        expectedAccountId: b.id,
      })
    ).status,
    200,
  );
  assert.equal((await board(a)).viewer!.rank, 1);
  assert.equal((await board(a, 'global')).total, 4);

  await pool.query(
    'update completion_facts set generator_version = null where owner_id=$1',
    [d.id],
  );
  assert.equal((await board(a)).total, 2);
  await pool.query(
    'update completion_facts set generator_version = $2 where owner_id=$1',
    [d.id, dailyDefinition.generator],
  );
  const training = async (
    actor: Actor,
    scope = 'global',
    query = '',
  ): Promise<Leaderboard> => {
    const response = await request(
      `/api/leaderboards/training?scope=${scope}${query}`,
      actor,
    );
    assert.equal(response.status, 200, await response.clone().text());
    assert.equal(response.headers.get('cache-control'), 'no-store');
    const value = (await response.json()) as Leaderboard;
    assert.equal(value.accountId, actor.id);
    assert.equal(value.date, undefined);
    return value;
  };
  assert.equal((await request('/api/leaderboards/training')).status, 401);
  assert.equal(
    (await request('/api/leaderboards/training?scope=other', a)).status,
    400,
  );
  assert.equal((await training(a)).total, 0);
  await upload(a, today, 1000, `${today}T13:00:00.000Z`, 'training');
  await upload(a, today, 100, `${today}T14:00:00.000Z`, 'training');
  await upload(b, today, 100, `${today}T15:00:00.000Z`, 'training');
  await upload(c, today, 1000, `${today}T16:00:00.000Z`, 'training');
  const trainingGlobal = await training(a, 'global', '&limit=1');
  assert.equal(trainingGlobal.total, 3);
  assert.ok([a.id, b.id].includes(trainingGlobal.items[0]!.player.id));
  assert.equal(trainingGlobal.viewer?.rank, 1);
  assert.equal(trainingGlobal.nextCursor, '1');
  assert.deepEqual(
    (await training(a)).items.map((row) => row.rank),
    [1, 1, 3],
  );
  assert.equal((await training(a, 'friends')).total, 2);
  await pool.query(
    'update completion_facts set score_version = $2 where owner_id=$1 and mode=$3',
    [c.id, SCORE_VERSION - 1, 'training'],
  );
  assert.equal((await training(a)).total, 2);
  return [
    'Daily Global/Friends filtering, score/time ties, viewer rank outside the first page, and pagination',
    'Automatic historical uploads, first accepted Daily, duplicate retries, and same-UTC-date eligibility',
    'Friend acceptance/removal updates existing scores; unknown challenge versions and private fields stay out',
    'Training keeps one best current-version score per Trainer with Global/Friends filtering, ties, and pagination',
  ];
}
