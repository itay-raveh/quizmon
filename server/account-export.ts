import { Client } from 'pg';
import { formatVersions } from '../src/domain/versions.ts';

const accountExportBatchSize = 100;
const accountExportTimeoutMs = 60_000;

const sections = {
  rounds:
    'SELECT id, player_id, mode, day, puzzle_id, started_on, completed_at, credited, data FROM round WHERE player_id = $1 ORDER BY completed_at, id',
  datasets:
    'SELECT id, player_id FROM dataset WHERE player_id = $1 ORDER BY id',
  operations:
    'SELECT id, player_id, hash, status, reason FROM op WHERE player_id = $1 ORDER BY id',
  friends:
    'SELECT id, from_id, to_id, status, created_at, updated_at FROM friend WHERE from_id = $1 OR to_id = $1 ORDER BY id',
} as const;

export async function exportAccount(
  connectionString: string,
  accountId: string,
  signal: AbortSignal,
): Promise<Response> {
  const client = new Client({
    connectionString,
    connectionTimeoutMillis: 5_000,
  });
  let closing: Promise<void> | undefined;
  const close = () => (closing ??= client.end());
  let aborted = false;
  const abort = () => {
    aborted = true;
    void close().catch(() => {});
  };
  client.on('error', abort);
  const timeout = setTimeout(abort, accountExportTimeoutMs);
  signal.addEventListener('abort', abort, { once: true });
  const cleanup = async () => {
    clearTimeout(timeout);
    signal.removeEventListener('abort', abort);
    await close();
  };
  try {
    if (signal.aborted) throw new Error('Export cancelled.');
    await client.connect();
    await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
    await client.query("SET LOCAL statement_timeout = '5s'");
    const snapshot = await client.query<{
      snapshot: string;
      exported_at: Date;
    }>(
      'SELECT pg_current_snapshot()::text AS snapshot, transaction_timestamp() AS exported_at',
    );
    const identity = await client.query<Record<string, unknown>>(
      `SELECT id, email, created_at FROM "user" WHERE id = $1`,
      [accountId],
    );
    if (!identity.rows[0]) throw new Error('Account no longer available.');
    const profile = await client.query<Record<string, unknown>>(
      'SELECT * FROM player WHERE id = $1',
      [accountId],
    );
    const providers = await client.query<Record<string, unknown>>(
      'SELECT id, account_id, provider_id, created_at FROM account WHERE user_id = $1 ORDER BY id',
      [accountId],
    );
    const service = await client.query<{ epoch: string }>(
      'SELECT epoch FROM instance WHERE id = 1',
    );
    const header = {
      format: 'quizmon-account-export',
      version: formatVersions.accountExport,
      accountId,
      serverEpoch: service.rows[0]?.epoch ?? null,
      snapshot: snapshot.rows[0]!.snapshot,
      exportedAt: snapshot.rows[0]!.exported_at.toISOString(),
      scope:
        'Retained server data. Unsynced changes remain on their originating devices and are included in browser backups.',
      account: identity.rows[0],
      providers: providers.rows,
      player: profile.rows[0] ?? null,
    };
    async function* records() {
      try {
        yield JSON.stringify(header).slice(0, -1);
        for (const [name, query] of Object.entries(sections)) {
          if (aborted) throw new Error('Export cancelled.');
          await client.query(
            `DECLARE export_rows NO SCROLL CURSOR FOR ${query}`,
            [accountId],
          );
          yield `,${JSON.stringify(name)}:[`;
          let first = true;
          for (;;) {
            if (aborted) throw new Error('Export cancelled.');
            const batch = await client.query(
              `FETCH FORWARD ${accountExportBatchSize} FROM export_rows`,
            );
            if (batch.rows.length === 0) break;
            yield (first ? '' : ',') +
              batch.rows.map((row) => JSON.stringify(row)).join(',');
            first = false;
          }
          await client.query('CLOSE export_rows');
          yield ']';
        }
        if (aborted) throw new Error('Export cancelled.');
        await client.query('COMMIT');
        await cleanup();
        yield '}';
      } finally {
        await cleanup();
      }
    }
    const iterator = records();
    const encoder = new TextEncoder();
    const body = new ReadableStream<Uint8Array>({
      async pull(controller) {
        try {
          const next = await iterator.next();
          if (aborted) throw new Error('Export cancelled.');
          if (next.done) controller.close();
          else controller.enqueue(encoder.encode(next.value));
        } catch (error) {
          await cleanup();
          controller.error(error);
        }
      },
      async cancel() {
        abort();
        await cleanup();
        await iterator.return(undefined);
      },
    });
    return new Response(body, {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'private, no-store',
        'Content-Disposition': 'attachment; filename="quizmon-account.json"',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    await cleanup();
    throw error;
  }
}
