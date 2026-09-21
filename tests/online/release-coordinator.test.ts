import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { readMigrationFiles } from 'drizzle-orm/migrator';
import { Client } from 'pg';
import {
  ActivationNotStartedError,
  PendingActivationError,
  coordinateRelease,
  type DeploymentReceipt,
  type ReleaseCoordinatorOptions,
} from '../../deploy/release-coordinator.ts';
import { MigrationBusyError } from '../../deploy/release-lock.ts';

const admin = new Client({
  connectionString: 'postgresql://postgres:unused@127.0.0.1:5548/postgres',
});
await admin.connect();
const migrationsFolder = fileURLToPath(
  new URL('../../server/migrations', import.meta.url),
);
const migrationCount = readMigrationFiles({ migrationsFolder }).length;
const operation = () => ({
  version: 1 as const,
  id: crypto.randomUUID(),
  artifact: 'sha256:' + '1'.repeat(64),
  configuration: 'sha256:' + '2'.repeat(64),
});
const receipt = () => ({
  versionId: crypto.randomUUID(),
  deploymentId: crypto.randomUUID(),
});

async function fixture(
  run: (context: {
    client: Client;
    options: ReleaseCoordinatorOptions;
    activations: string[];
    verification: string[];
  }) => Promise<void>,
) {
  const database = 'quizmon_release_' + crypto.randomUUID().replaceAll('-', '');
  await admin.query('CREATE DATABASE ' + database);
  const connection = {
    connectionString: `postgresql://postgres:unused@127.0.0.1:5548/${database}`,
  };
  const client = new Client(connection);
  await client.connect();
  const activations: string[] = [];
  const verification: string[] = [];
  const options: ReleaseCoordinatorOptions = {
    connection,
    migrationsFolder,
    operation: operation(),
    preflight: async () => {},
    assertSelected: async () => {},
    configure: async () => {},
    activate: (selected) => {
      activations.push(selected.id);
      return Promise.resolve(receipt());
    },
    inspectActivation: () => Promise.reject(new PendingActivationError()),
    verifyDeployment: (actual) => {
      verification.push(actual.deploymentId);
      return Promise.resolve();
    },
  };
  try {
    await run({ client, options, activations, verification });
  } finally {
    await client.end();
    await admin.query('DROP DATABASE ' + database + ' WITH (FORCE)');
  }
}

try {
  await test('one activation follows committed migrations; duplicate execution verifies without redeployment', () =>
    fixture(async ({ client, options, activations, verification }) => {
      const first = await coordinateRelease(options);
      assert.equal(first.status, 'activated');
      if (first.status === 'activated')
        assert.deepEqual(first.migrations, {
          applied: migrationCount,
          total: migrationCount,
        });
      assert.equal(
        (
          await client.query<{ count: number }>(
            'SELECT count(*)::int AS count FROM drizzle.__drizzle_migrations',
          )
        ).rows[0]!.count,
        migrationCount,
      );
      const duplicate = await coordinateRelease(options);
      assert.equal(duplicate.status, 'verified-existing');
      assert.deepEqual(duplicate.receipt, first.receipt);
      assert.equal(activations.length, 1);
      assert.equal(verification.length, 2);
      await assert.rejects(
        coordinateRelease({
          ...options,
          operation: {
            ...options.operation,
            configuration: 'sha256:' + '3'.repeat(64),
          },
        }),
        /different inputs/,
      );
      assert.equal(activations.length, 1);
    }));

  await test('failed preflight and obsolete selection leave a new database unmigrated', () =>
    fixture(async ({ client, options, activations }) => {
      await assert.rejects(
        coordinateRelease({
          ...options,
          preflight: () => Promise.reject(new Error('invalid inputs')),
        }),
        /invalid inputs/,
      );
      await assert.rejects(
        coordinateRelease({
          ...options,
          assertSelected: () => Promise.reject(new Error('obsolete release')),
        }),
        /obsolete release/,
      );
      assert.equal(
        (
          await client.query<{ migrations: string | null }>(
            "SELECT to_regclass('drizzle.__drizzle_migrations') AS migrations, to_regclass('quizmon_release.operations') AS journal",
          )
        ).rows[0]!.migrations,
        null,
      );
      assert.equal(
        (
          await client.query<{ journal: string | null }>(
            "SELECT to_regclass('quizmon_release.operations') AS journal",
          )
        ).rows[0]!.journal,
        null,
      );
      assert.equal(activations.length, 0);
    }));

  await test('selection is checked again after migration and configuration', () =>
    fixture(async ({ options, activations }) => {
      let selected = true;
      await assert.rejects(
        coordinateRelease({
          ...options,
          assertSelected: () =>
            selected
              ? Promise.resolve()
              : Promise.reject(new Error('obsolete release')),
          configure: () => {
            selected = false;
            return Promise.resolve();
          },
        }),
        /obsolete release/,
      );
      assert.equal(activations.length, 0);
      const replacement = await coordinateRelease({
        ...options,
        operation: operation(),
      });
      if (replacement.status === 'activated')
        assert.deepEqual(replacement.migrations, {
          applied: 0,
          total: migrationCount,
        });
      else assert.fail('replacement should activate');
    }));

  await test('retry after committed SQL and interrupted configuration does not replay migrations', () =>
    fixture(async ({ options, activations }) => {
      await assert.rejects(
        coordinateRelease({
          ...options,
          configure: () =>
            Promise.reject(new Error('interrupted after commit')),
        }),
        /interrupted/,
      );
      assert.equal(activations.length, 0);
      const result = await coordinateRelease(options);
      if (result.status === 'activated')
        assert.deepEqual(result.migrations, {
          applied: 0,
          total: migrationCount,
        });
      else assert.fail('retry should activate');
    }));

  await test('the database lock remains held during the external activation call', () =>
    fixture(async ({ options }) => {
      const entered = Promise.withResolvers<void>();
      const finish = Promise.withResolvers<void>();
      const first = coordinateRelease({
        ...options,
        activate: async () => {
          entered.resolve();
          await finish.promise;
          return receipt();
        },
      });
      await entered.promise;
      try {
        await assert.rejects(
          coordinateRelease({ ...options, operation: operation() }),
          MigrationBusyError,
        );
      } finally {
        finish.resolve();
        await first;
      }
    }));

  await test('an unacknowledged activation prevents both the same and a newer operation from activating', () =>
    fixture(async ({ client, options, activations }) => {
      await assert.rejects(
        coordinateRelease({
          ...options,
          activate: (selected) => {
            activations.push(selected.id);
            return Promise.reject(new Error('response lost after activation'));
          },
        }),
        PendingActivationError,
      );
      assert.equal(
        (
          await client.query<{ phase: string }>(
            'SELECT phase FROM quizmon_release.operations',
          )
        ).rows[0]!.phase,
        'activating',
      );
      await assert.rejects(coordinateRelease(options), PendingActivationError);
      await assert.rejects(
        coordinateRelease({ ...options, operation: operation() }),
        PendingActivationError,
      );
      assert.equal(activations.length, 1);
    }));

  await test('recovery persists the confirmed receipt before verification and never repeats migrations or activation', () =>
    fixture(async ({ client, options, activations }) => {
      await assert.rejects(
        coordinateRelease({
          ...options,
          activate: (selected) => {
            activations.push(selected.id);
            return Promise.reject(new Error('response lost'));
          },
        }),
        PendingActivationError,
      );
      const confirmed = receipt();
      let inspections = 0;
      const recovery = {
        ...options,
        migrationsFolder: '/missing-migrations',
        configure: () => Promise.reject(new Error('must not configure')),
        inspectActivation: () => {
          inspections++;
          return Promise.resolve(confirmed);
        },
      };
      await assert.rejects(
        coordinateRelease({ ...recovery, operation: operation() }),
        PendingActivationError,
      );
      assert.equal(inspections, 0);
      await assert.rejects(
        coordinateRelease({
          ...recovery,
          verifyDeployment: () => Promise.reject(new Error('read failed')),
        }),
        /verification failed/,
      );
      assert.deepEqual(
        (
          await client.query(
            'SELECT phase, receipt FROM quizmon_release.operations',
          )
        ).rows,
        [{ phase: 'verifying', receipt: confirmed }],
      );
      const result = await coordinateRelease(recovery);
      assert.equal(result.status, 'verified-existing');
      assert.deepEqual(result.receipt, confirmed);
      assert.equal(inspections, 1);
      assert.equal(activations.length, 1);
    }));

  await test('failed receipt persistence leaves recovery retryable without another activation', () =>
    fixture(async ({ client, options, activations }) => {
      await assert.rejects(
        coordinateRelease({
          ...options,
          activate: (selected) => {
            activations.push(selected.id);
            return Promise.reject(new Error('response lost'));
          },
        }),
        PendingActivationError,
      );
      await client.query(`CREATE FUNCTION reject_receipt() RETURNS trigger LANGUAGE plpgsql AS $$
        BEGIN RAISE EXCEPTION 'receipt write failed'; END $$`);
      await client.query(`CREATE TRIGGER reject_receipt BEFORE UPDATE ON quizmon_release.operations
        FOR EACH ROW EXECUTE FUNCTION reject_receipt()`);
      const confirmed = receipt();
      const recovery = {
        ...options,
        inspectActivation: () => Promise.resolve(confirmed),
      };
      await assert.rejects(coordinateRelease(recovery), /receipt write failed/);
      assert.deepEqual(
        (
          await client.query(
            'SELECT phase, receipt FROM quizmon_release.operations',
          )
        ).rows,
        [{ phase: 'activating', receipt: null }],
      );
      await client.query(
        'DROP TRIGGER reject_receipt ON quizmon_release.operations',
      );
      const result = await coordinateRelease(recovery);
      assert.equal(result.status, 'verified-existing');
      assert.deepEqual(result.receipt, confirmed);
      assert.equal(activations.length, 1);
    }));

  await test('verification failure preserves the receipt and retry only verifies', () =>
    fixture(async ({ client, options, activations }) => {
      await assert.rejects(
        coordinateRelease({
          ...options,
          verifyDeployment: () =>
            Promise.reject(new Error('health check failed')),
        }),
        /verification failed/,
      );
      const saved = (
        await client.query<{ phase: string; receipt: DeploymentReceipt }>(
          'SELECT phase, receipt FROM quizmon_release.operations',
        )
      ).rows[0]!;
      assert.equal(saved.phase, 'verifying');
      await assert.rejects(
        coordinateRelease({ ...options, operation: operation() }),
        PendingActivationError,
      );
      const retried = await coordinateRelease(options);
      assert.equal(retried.status, 'verified-existing');
      assert.deepEqual(retried.receipt, saved.receipt);
      assert.equal(activations.length, 1);
    }));

  await test('a proven failure before an external mutation allows a safe retry', () =>
    fixture(async ({ client, options, activations }) => {
      await assert.rejects(
        coordinateRelease({
          ...options,
          activate: () => Promise.reject(new ActivationNotStartedError()),
        }),
        ActivationNotStartedError,
      );
      assert.equal(
        (
          await client.query<{ count: number }>(
            'SELECT count(*)::int AS count FROM quizmon_release.operations',
          )
        ).rows[0]!.count,
        0,
      );
      await coordinateRelease(options);
      assert.equal(activations.length, 1);
    }));

  await test('losing the lock during a delayed external response leaves durable uncertainty for a replacement Job', () =>
    fixture(async ({ client, options, activations }) => {
      const entered = Promise.withResolvers<void>();
      const finish = Promise.withResolvers<void>();
      const aborted = Promise.withResolvers<void>();
      let pid = 0;
      const first = coordinateRelease({
        ...options,
        configure: async (locked) => {
          pid = (
            await locked.query<{ pid: number }>(
              'SELECT pg_backend_pid() AS pid',
            )
          ).rows[0]!.pid;
        },
        activate: async (selected, signal) => {
          activations.push(selected.id);
          signal.addEventListener('abort', () => aborted.resolve(), {
            once: true,
          });
          entered.resolve();
          await finish.promise;
          return receipt();
        },
      });
      const rejected = assert.rejects(first);
      await entered.promise;
      try {
        await admin.query('SELECT pg_terminate_backend($1)', [pid]);
        await aborted.promise;
        await assert.rejects(
          coordinateRelease({ ...options, operation: operation() }),
          PendingActivationError,
        );
        assert.equal(
          (
            await client.query<{ phase: string }>(
              'SELECT phase FROM quizmon_release.operations',
            )
          ).rows[0]!.phase,
          'activating',
        );
        assert.equal(activations.length, 1);
      } finally {
        finish.resolve();
        await rejected;
      }
    }));

  await test('migration checksum mismatch fails before activation intent is written', () =>
    fixture(async ({ client, options, activations }) => {
      await coordinateRelease(options);
      await client.query(
        "UPDATE drizzle.__drizzle_migrations SET hash = 'changed' WHERE id = 1",
      );
      await assert.rejects(
        coordinateRelease({ ...options, operation: operation() }),
        /checksum differs/,
      );
      assert.equal(activations.length, 1);
      assert.equal(
        (
          await client.query<{ count: number }>(
            'SELECT count(*)::int AS count FROM quizmon_release.operations',
          )
        ).rows[0]!.count,
        1,
      );
    }));

  await test('a future journal format is rejected even when its operation is already active', () =>
    fixture(async ({ client, options, activations }) => {
      await coordinateRelease(options);
      await client.query(
        'ALTER TABLE quizmon_release.operations DROP CONSTRAINT operations_version_check',
      );
      await client.query('UPDATE quizmon_release.operations SET version = 2');
      await assert.rejects(
        coordinateRelease({ ...options, operation: operation() }),
        /journal version/,
      );
      assert.equal(activations.length, 1);
    }));
} finally {
  await admin.end();
}
