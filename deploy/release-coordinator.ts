import { type Client, type ClientConfig } from 'pg';
import { isRecord } from '../src/lib/validation.ts';
import { migrateLockedDatabase } from './migration-runner.ts';
import { withReleaseLock } from './release-lock.ts';

export interface ReleaseOperation {
  version: 1;
  id: string;
  artifact: string;
  configuration: string;
}

export interface DeploymentReceipt {
  versionId: string;
  deploymentId: string;
}

const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const digest = /^sha256:[a-f0-9]{64}$/;

export class PendingActivationError extends Error {
  constructor() {
    super(
      'A release has an unresolved deployment. Establish its outcome before another activation.',
    );
  }
}

export class ActivationNotStartedError extends Error {
  constructor() {
    super('Deployment was not started. The same release may be retried.');
  }
}

export function readOperation(value: unknown): ReleaseOperation {
  if (
    !isRecord(value) ||
    value.version !== 1 ||
    typeof value.id !== 'string' ||
    !uuid.test(value.id) ||
    typeof value.artifact !== 'string' ||
    !digest.test(value.artifact) ||
    typeof value.configuration !== 'string' ||
    !digest.test(value.configuration)
  )
    throw new Error('Invalid release operation identity.');
  return {
    version: 1,
    id: value.id.toLowerCase(),
    artifact: value.artifact,
    configuration: value.configuration,
  };
}

function readReceipt(value: unknown): DeploymentReceipt {
  if (
    !isRecord(value) ||
    typeof value.versionId !== 'string' ||
    !uuid.test(value.versionId) ||
    typeof value.deploymentId !== 'string' ||
    !uuid.test(value.deploymentId)
  )
    throw new PendingActivationError();
  return { versionId: value.versionId, deploymentId: value.deploymentId };
}

interface JournalEntry {
  id: string;
  version: number;
  artifact: string;
  configuration: string;
  phase: 'activating' | 'verifying' | 'active';
  receipt: unknown;
}

async function journal(client: Client) {
  await client.query(`CREATE SCHEMA IF NOT EXISTS quizmon_release`);
  await client.query(`CREATE TABLE IF NOT EXISTS quizmon_release.operations (
    id uuid PRIMARY KEY,
    version integer NOT NULL CHECK (version = 1),
    artifact text NOT NULL,
    configuration text NOT NULL,
    phase text NOT NULL CHECK (phase IN ('activating', 'verifying', 'active')),
    receipt jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CHECK ((phase = 'activating' AND receipt IS NULL) OR (phase <> 'activating' AND receipt IS NOT NULL))
  )`);
}

export interface ReleaseCoordinatorOptions {
  connection: ClientConfig;
  operation: ReleaseOperation;
  migrationsFolder: string;
  preflight: () => Promise<void>;
  assertSelected: (operation: ReleaseOperation) => Promise<void>;
  configure: (client: Client) => Promise<void>;
  activate: (
    operation: ReleaseOperation,
    signal: AbortSignal,
  ) => Promise<DeploymentReceipt>;
  verifyDeployment: (receipt: DeploymentReceipt) => Promise<void>;
}

export async function coordinateRelease(options: ReleaseCoordinatorOptions) {
  const operation = readOperation(options.operation);
  await options.preflight();
  return withReleaseLock(options.connection, async (session) => {
    const { client, assertConnected } = session;
    await options.assertSelected(operation);
    assertConnected();
    await journal(client);
    if (
      (
        await client.query(
          `SELECT 1 FROM quizmon_release.operations WHERE version <> 1 LIMIT 1`,
        )
      ).rowCount
    )
      throw new Error('Unsupported release journal version.');
    const entries = (
      await client.query<JournalEntry>(
        `SELECT id, version, artifact, configuration, phase, receipt
       FROM quizmon_release.operations WHERE id = $1 OR phase <> 'active'`,
        [operation.id],
      )
    ).rows;
    if (entries.some((entry) => entry.version !== 1))
      throw new Error('Unsupported release journal version.');
    const own = entries.find((entry) => entry.id === operation.id);
    if (
      own &&
      (own.artifact !== operation.artifact ||
        own.configuration !== operation.configuration)
    )
      throw new Error(
        'A release operation cannot be reused with different inputs.',
      );
    if (
      entries.some(
        (entry) => entry.phase === 'activating' || entry.id !== operation.id,
      )
    )
      throw new PendingActivationError();
    const verify = async (receipt: DeploymentReceipt) => {
      try {
        await options.verifyDeployment(receipt);
      } catch {
        throw new Error(
          'Deployment verification failed. Retry verification for the same operation before promoting another release.',
        );
      }
      assertConnected();
      await client.query(
        `UPDATE quizmon_release.operations SET phase = 'active', updated_at = now() WHERE id = $1`,
        [operation.id],
      );
      return receipt;
    };
    if (own) {
      const receipt = await verify(readReceipt(own.receipt));
      return { status: 'verified-existing' as const, receipt };
    }
    const migrations = await migrateLockedDatabase(
      session,
      options.migrationsFolder,
    );
    await options.configure(client);
    assertConnected();
    await options.assertSelected(operation);
    assertConnected();
    // Commit intent before any external request. A lost lock cannot erase uncertainty.
    await client.query(
      `INSERT INTO quizmon_release.operations (id, version, artifact, configuration, phase)
      VALUES ($1, 1, $2, $3, 'activating')`,
      [operation.id, operation.artifact, operation.configuration],
    );
    assertConnected();
    let receipt: DeploymentReceipt;
    try {
      receipt = readReceipt(await options.activate(operation, session.signal));
    } catch (error) {
      assertConnected();
      if (error instanceof ActivationNotStartedError) {
        await client.query(
          `DELETE FROM quizmon_release.operations WHERE id = $1 AND phase = 'activating'`,
          [operation.id],
        );
        throw error;
      }
      throw new PendingActivationError();
    }
    assertConnected();
    await client.query(
      `UPDATE quizmon_release.operations SET phase = 'verifying', receipt = $2, updated_at = now() WHERE id = $1`,
      [operation.id, JSON.stringify(receipt)],
    );
    await verify(receipt);
    return { status: 'activated' as const, migrations, receipt };
  });
}
