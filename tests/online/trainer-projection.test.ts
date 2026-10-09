import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Worker } from 'node:worker_threads';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import {
  createTrainerProjector,
  type ProjectionMessage,
} from '../../server/trainer-projection.ts';
import { projectTrainerHistory } from '../../server/rxdb-read.ts';
import { createTrainerProfile } from '../../src/domain/player/trainer-profile.ts';
import { compactCompletion } from '../../src/domain/sync/compact-rounds.ts';
import { completion } from './progress-fixtures.ts';

await test('one reusable worker preserves projections, rejects invalid facts privately, and recovers after termination', async () => {
  const profile = createTrainerProfile();
  const rounds = ['training', 'daily', 'league'].map((mode) =>
    compactCompletion(completion(mode as 'training' | 'daily' | 'league')),
  );
  let created = 0;
  let terminateNext = false;
  const projector = createTrainerProjector(() => {
    created++;
    const worker = new Worker(
      new URL('../../server/trainer-projection-worker.ts', import.meta.url),
    );
    worker.on('message', (message: ProjectionMessage) => {
      if (terminateNext && message.type === 'started') {
        terminateNext = false;
        void worker.terminate();
      }
    });
    return worker;
  });
  try {
    await projector.ready();
    assert.deepEqual(
      (await projector.run({ profile, rounds, detail: true })).detail,
      projectTrainerHistory(profile, rounds),
    );
    assert.equal(
      (await projector.run({ profile, rounds: [rounds[2]], detail: false }))
        .leagueCompleted,
      true,
    );
    assert.equal(created, 1);
    terminateNext = true;
    await assert.rejects(
      projector.run({
        profile,
        rounds: Array.from({ length: 1000 }, () => rounds[0]),
        detail: true,
      }),
      { status: 503, retryAfter: '1' },
    );
    assert.deepEqual(
      (await projector.run({ profile, rounds, detail: true })).detail,
      projectTrainerHistory(profile, rounds),
    );
    assert.equal(created, 2);
    for (const invalid of [null, { name: 'private fixture value' }])
      await assert.rejects(
        projector.run({ profile: invalid, rounds: [], detail: true }),
        (error: Error) => !error.message.includes('private fixture value'),
      );
    assert.equal(
      (await projector.run({ profile, rounds, detail: true })).roundCount,
      rounds.length,
    );
    assert.equal(created, 2);
  } finally {
    await projector.close();
  }
  await assert.rejects(projector.run({ profile, rounds, detail: true }), {
    status: 503,
  });
});

await test('the runtime Sentry preload initializes the main process but no worker client', async () => {
  const instrument = new URL('../../server/instrument.ts', import.meta.url);
  const env = { ...process.env, SENTRY_DSN: 'http://fixture@127.0.0.1:1/1' };
  const main = await promisify(execFile)(
    process.execPath,
    [
      '--import',
      instrument.href,
      '--input-type=module',
      '-e',
      "import * as Sentry from '@sentry/node'; console.log(Boolean(Sentry.getClient())); await Sentry.close(0);",
    ],
    { env, timeout: 10_000 },
  );
  assert.equal(main.stdout.trim(), 'true');
  const initialized = Promise.withResolvers<boolean>();
  const projector = createTrainerProjector(() => {
    const worker = new Worker(
      new URL('./fixtures/trainer-worker-preload.ts', import.meta.url),
      { env, execArgv: ['--import', instrument.href] },
    );
    worker.on('message', (message: { type: string; initialized?: boolean }) => {
      if (message.type === 'preload-check')
        initialized.resolve(Boolean(message.initialized));
    });
    return worker;
  });
  try {
    await projector.ready();
    assert.equal(await initialized.promise, false);
    assert.equal(
      (
        await projector.run({
          profile: createTrainerProfile(),
          rounds: [],
          detail: true,
        })
      ).roundCount,
      0,
    );
  } finally {
    await projector.close();
  }
});
