import { writeFile } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { Client } from 'pg';
import { projectRoundHistory } from '../src/domain/player/game-history.ts';
import { readBoard, readTrainer } from '../server/target-read.ts';
import { exportAccount } from '../server/account-export.ts';
import { targetSubmitRound } from '../server/target-progress-api.ts';
import { rebuildRoundScores } from '../deploy/rebuild-round-score.ts';
import type { RoundFact } from '../src/domain/sync/round-facts.ts';

const databaseUrl = process.argv[2];
const reportPath = process.argv[3];
if (!databaseUrl || !reportPath)
  throw new Error(
    'Usage: node scripts/benchmark-new-db.ts LOCAL_DISPOSABLE_DATABASE_URL REPORT.json',
  );
const parsed = new URL(databaseUrl);
if (
  !['127.0.0.1', 'localhost'].includes(parsed.hostname) ||
  !/^quizmon_(import|bench|test|cache|validate)/.test(parsed.pathname.slice(1))
)
  throw new Error('Benchmark writes require a disposable local database.');
const pool = new Pool({ connectionString: databaseUrl, max: 20 });
const db = drizzle(pool);
const percentile = (values: number[], p: number) => {
  const sorted = [...values].sort((a, b) => a - b);
  return (
    Math.round(
      sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * p) - 1)]! *
        10,
    ) / 10
  );
};
const timed = async (work: () => Promise<unknown>) => {
  const start = performance.now();
  await work();
  return performance.now() - start;
};
const measure = async (work: () => Promise<unknown>, concurrent: number) => {
  const elapsed = await Promise.all(
    Array.from({ length: concurrent }, () => timed(work)),
  );
  return { p50: percentile(elapsed, 0.5), p95: percentile(elapsed, 0.95) };
};
try {
  const sourceUsers = (
    await pool.query<{ id: string }>('SELECT id FROM player ORDER BY id')
  ).rows;
  const sourceRounds = (
    await pool.query<{
      player_id: string;
      mode: string;
      day: string | null;
      puzzle_id: string | null;
      started_on: string | null;
      completed_at: Date;
      credited: boolean;
      data: RoundFact['data'];
      score: number;
      elapsed_ms: number;
    }>(
      'SELECT r.player_id,r.mode,r.day,r.puzzle_id,r.started_on,r.completed_at,r.credited,r.data,s.score,s.elapsed_ms FROM round r JOIN round_score s ON s.round_id=r.id ORDER BY r.completed_at',
    )
  ).rows;
  if (!sourceUsers.length || !sourceRounds.length)
    throw new Error('Import a sample before benchmarking.');
  const initial = (
    await pool.query<{ count: string }>(
      'SELECT count(*)::text AS count FROM "user"',
    )
  ).rows[0]!.count;
  if (Number(initial) !== sourceUsers.length)
    throw new Error('Benchmark target already contains synthetic users.');
  const viewer = sourceUsers[0]!.id;
  const trainer = sourceUsers.find(
    (user) =>
      sourceRounds.filter((round) => round.player_id === user.id).length > 5,
  )!.id;
  const daily = sourceRounds.find((round) => round.mode === 'daily');
  const results = [];
  for (const scale of [1, 10, 100]) {
    if (scale > 1) {
      for (let copy = scale === 10 ? 1 : 10; copy < scale; copy++) {
        const owners = new Map<string, string>();
        for (const [index, user] of sourceUsers.entries()) {
          const id = `bench-${copy}-${index}`;
          owners.set(user.id, id);
          await pool.query(
            'INSERT INTO "user"(id,name,email) VALUES ($1,$2,$3)',
            [id, 'Benchmark trainer', `${id}@example.test`],
          );
          await pool.query('INSERT INTO player(id,code) VALUES ($1,$2)', [
            id,
            Buffer.from(`${copy}:${index}`)
              .toString('hex')
              .padEnd(16, '0')
              .slice(0, 16)
              .toUpperCase(),
          ]);
        }
        for (const row of sourceRounds) {
          const id = crypto.randomUUID();
          await pool.query(
            `INSERT INTO round(id,player_id,mode,day,puzzle_id,started_on,completed_at,credited,data)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
            [
              id,
              owners.get(row.player_id),
              row.mode,
              row.day,
              row.puzzle_id,
              row.started_on,
              row.completed_at,
              row.credited,
              row.data,
            ],
          );
          await pool.query(
            'INSERT INTO round_score(round_id,score,elapsed_ms) VALUES ($1,$2,$3)',
            [id, row.score, row.elapsed_ms],
          );
        }
      }
    }
    const training = await measure(
      () => readBoard(db, viewer, 'training', 'global', 0, 20),
      1,
    );
    const trainerRead = await measure(() => readTrainer(db, trainer), 1);
    const dailyRead = daily
      ? await measure(
          () =>
            readBoard(
              db,
              viewer,
              'daily',
              'global',
              0,
              20,
              daily.day!,
              daily.puzzle_id!,
            ),
          1,
        )
      : null;
    const parallel = await Promise.all(
      [1, 20, 100].map(async (n) => ({
        readers: n,
        training: await measure(
          () => readBoard(db, viewer, 'training', 'global', 0, 20),
          n,
        ),
      })),
    );
    const localRounds = sourceRounds
      .filter((row) => row.player_id === trainer)
      .map(
        (row) =>
          ({
            id: crypto.randomUUID(),
            mode: row.mode,
            day: row.day,
            puzzle_id: row.puzzle_id,
            started_on: row.started_on,
            completed_at: row.completed_at.toISOString(),
            credited: row.credited,
            data: row.data,
          }) as RoundFact,
      );
    const thousand = Array.from({ length: 1000 }, (_, i) => ({
      ...localRounds[i % localRounds.length]!,
      id: crypto.randomUUID(),
    }));
    const projection = await measure(
      () => Promise.resolve(projectRoundHistory(thousand)),
      5,
    );
    const exportMs = await measure(async () => {
      const response = await exportAccount(
        databaseUrl,
        trainer,
        new AbortController().signal,
      );
      await response.arrayBuffer();
    }, 1);
    const explain = await pool.query<{ 'QUERY PLAN': string }>(
      "EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT) SELECT DISTINCT ON (r.player_id) r.id,s.score FROM round r JOIN round_score s ON s.round_id=r.id WHERE r.mode='training' AND r.credited ORDER BY r.player_id,s.score DESC,s.elapsed_ms,r.completed_at,r.id",
    );
    results.push({
      scale,
      users: sourceUsers.length * scale,
      rounds: sourceRounds.length * scale,
      training,
      trainer: trainerRead,
      daily: dailyRead,
      parallel,
      projection1000: projection,
      accountExport: exportMs,
      explain: explain.rows.map((row) => row['QUERY PLAN']),
      rssMb: Math.round(process.memoryUsage().rss / 1024 / 1024),
    });
  }
  let [claim] = (
    await pool.query<{ id: string; player_id: string }>(
      'SELECT id,player_id FROM dataset LIMIT 1',
    )
  ).rows;
  if (!claim) {
    claim = { id: crypto.randomUUID(), player_id: viewer };
    await pool.query('INSERT INTO dataset(id,player_id) VALUES ($1,$2)', [
      claim.id,
      claim.player_id,
    ]);
  }
  let [instance] = (
    await pool.query<{ epoch: string }>('SELECT epoch FROM instance WHERE id=1')
  ).rows;
  if (!instance) {
    instance = { epoch: crypto.randomUUID() };
    await pool.query('INSERT INTO instance(id,epoch) VALUES (1,$1)', [
      instance.epoch,
    ]);
  }
  const template = sourceRounds.find((round) => round.mode === 'training');
  if (!claim || !instance || !template)
    throw new Error('Benchmark needs a linked training sample.');
  const mixed = [];
  for (const readers of [1, 20, 100]) {
    const read = Promise.all(
      Array.from({ length: readers }, () =>
        timed(() => readBoard(db, viewer, 'training', 'global', 0, 20)),
      ),
    );
    const write = timed(() =>
      targetSubmitRound(db, claim.player_id, claim.id, instance.epoch, {
        id: crypto.randomUUID(),
        mode: 'training',
        day: null,
        puzzle_id: null,
        started_on: null,
        completed_at: new Date().toISOString(),
        data: template.data,
      }),
    );
    const [readMs, uploadMs] = await Promise.all([read, write]);
    mixed.push({
      readers,
      readP95: percentile(readMs, 0.95),
      uploadMs: Math.round(uploadMs * 10) / 10,
    });
  }
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  let rebuildMs: number;
  try {
    rebuildMs = await timed(() => rebuildRoundScores(client));
  } finally {
    await client.end();
  }
  await writeFile(
    reportPath,
    JSON.stringify(
      { results, mixed, rebuildMs, coldDeviceNotMeasured: true },
      null,
      2,
    ) + '\n',
    { flag: 'wx', mode: 0o600 },
  );
  process.stdout.write(`Benchmark report: ${reportPath}\n`);
} finally {
  await pool.end();
}
