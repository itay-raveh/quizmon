import { Client, type ClientConfig } from 'pg';

const releaseLockSql =
  "SELECT pg_try_advisory_lock(hashtext('quizmon'), hashtext('release')) AS acquired";

class MigrationBusyError extends Error {
  constructor() {
    super(
      'Another Quizmon release holds the database lock. Retry this release later.',
    );
  }
}

export interface ReleaseSession {
  client: Client;
  assertConnected: () => void;
}

export async function withReleaseLock<T>(
  connection: ClientConfig,
  run: (session: ReleaseSession) => Promise<T>,
): Promise<T> {
  const client = new Client(connection);
  let connectionError: Error | undefined;
  client.on('error', (error: Error) => {
    connectionError = error;
  });
  const assertConnected = () => {
    if (connectionError) throw connectionError;
  };
  try {
    await client.connect();
    const lock = await client.query<{ acquired: boolean }>(releaseLockSql);
    if (!lock.rows[0]?.acquired) throw new MigrationBusyError();
    const result = await run({
      client,
      assertConnected,
    });
    assertConnected();
    return result;
  } finally {
    // The session lock must outlive migration transactions and deployment work.
    // https://www.postgresql.org/docs/current/explicit-locking.html#ADVISORY-LOCKS
    await client.end();
  }
}
