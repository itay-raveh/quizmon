import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { exportAccount } from '../../server/account-export.ts';
import { applyAction, ProgressError } from '../../server/progress-api.ts';
import { action } from './progress-fixtures.ts';

export async function checkSourceRecovery(
  container: string,
  connectionString: string,
  owner: string,
  pool: Pool,
) {
  const before = await pool.query<{
    id: string;
    generation_id: string;
    epoch: string;
  }>(
    "SELECT d.id,d.generation_id,s.epoch FROM linked_datasets d CROSS JOIN service_state s WHERE d.owner_id=$1 AND s.id='main' LIMIT 1",
    [owner],
  );
  const identity = before.rows[0]!;
  const operation = action(
    identity.id,
    identity.generation_id,
    'discoveries.add',
    { pokemon: ['bulbasaur'] },
  );
  const outcome = await applyAction(
    drizzle(pool),
    owner,
    identity.epoch,
    operation,
  );
  const exported = (await (
    await exportAccount(connectionString, owner, new AbortController().signal)
  ).json()) as Record<string, unknown>;
  const dump = execFileSync(
    'docker',
    [
      'exec',
      container,
      'pg_dump',
      '-U',
      'friends_test',
      '-d',
      'friends_test',
      '-Fc',
    ],
    { timeout: 30_000, maxBuffer: 8 * 1024 * 1024 },
  );
  await pool.query('CREATE DATABASE quizmon_recovery_check');
  execFileSync(
    'docker',
    [
      'exec',
      '-i',
      container,
      'pg_restore',
      '-U',
      'friends_test',
      '-d',
      'quizmon_recovery_check',
      '--exit-on-error',
    ],
    { input: dump, timeout: 30_000 },
  );
  const restoredUrl = new URL(connectionString);
  restoredUrl.pathname = '/quizmon_recovery_check';
  const restored = new Pool({ connectionString: restoredUrl.toString() });
  try {
    const epoch = crypto.randomUUID();
    await restored.query("UPDATE service_state SET epoch=$1 WHERE id='main'", [
      epoch,
    ]);
    await assert.rejects(
      applyAction(drizzle(restored), owner, identity.epoch, operation),
      (error: unknown) =>
        error instanceof ProgressError && error.code === 'server_epoch_changed',
    );
    assert.deepEqual(
      await applyAction(drizzle(restored), owner, epoch, operation),
      outcome,
    );
    const after = (await (
      await exportAccount(
        restoredUrl.toString(),
        owner,
        new AbortController().signal,
      )
    ).json()) as Record<string, unknown>;
    for (const key of Object.keys(exported)) {
      if (['snapshot', 'exportedAt', 'serverEpoch'].includes(key)) continue;
      assert.deepEqual(after[key], exported[key], key);
    }
    assert.equal(after.serverEpoch, epoch);
  } finally {
    await restored.end();
  }
  return 'Disposable PostgreSQL dump/restore preserves account exports and retry identities; a changed server epoch rejects stale writers';
}
