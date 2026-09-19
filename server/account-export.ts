import { Client } from 'pg';
import { formatVersions } from '../src/domain/versions.ts';

const accountExportBatchSize = 100;
const accountExportTimeoutMs = 60_000;

const sections = {
  completionFacts:
    'SELECT id, owner_id, generation_id, completion_id, dataset_id, hash, completion, completed_at, record_version, progress_version, mode, daily_date, score_version, content_version, generator_version, contribution, eligible, revision, accepted_at FROM completion_facts WHERE owner_id = $1 ORDER BY id',
  discoveries:
    'SELECT id, owner_id, generation_id, pokemon, discovered, correct FROM player_pokemon WHERE owner_id = $1 ORDER BY id',
  dailyResults:
    'SELECT id, owner_id, generation_id, date, completion_id, result, streak_credit FROM daily_results WHERE owner_id = $1 ORDER BY id',
  trainingBests:
    'SELECT id, owner_id, generation_id, mode, score_version, completion_id, result FROM training_bests WHERE owner_id = $1 ORDER BY id',
  hallOfFame:
    'SELECT id, owner_id, generation_id, completion_id, completed_at, trainer_name, pokemon, result FROM hall_of_fame WHERE owner_id = $1 ORDER BY id',
  linkedDatasets:
    'SELECT id, owner_id, generation_id, link_id FROM linked_datasets WHERE owner_id = $1 ORDER BY id',
  operationOutcomes:
    'SELECT id, owner_id, generation_id, operation_id, hash, outcome, effect FROM operation_outcomes WHERE owner_id = $1 ORDER BY id',
  unresolvedIssues:
    'SELECT id, owner_id, generation_id, operation_id, reason, payload FROM sync_issues WHERE owner_id = $1 AND NOT dismissed ORDER BY id',
  friends: `SELECT r.id, r.status, r.created_at, r.updated_at,
    CASE WHEN r.sender_id = $1 THEN 'outgoing' ELSE 'incoming' END AS direction,
    jsonb_build_object('id', u.id, 'code', s.code,
      'name', COALESCE(NULLIF(BTRIM(a.edits->>'name'), ''), 'Trainer'),
      'partnerPokemon', a.edits->>'partnerPokemon') AS player
    FROM friend_requests r
    JOIN "user" u ON u.id = CASE WHEN r.user_low = $1 THEN r.user_high ELSE r.user_low END
    LEFT JOIN social_players s ON s.id = u.id
    LEFT JOIN account_state a ON a.id = u.id
    WHERE r.user_low = $1 OR r.user_high = $1 ORDER BY r.id`,
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
      `SELECT u.id, u.email, u.created_at, s.code AS friend_code
       FROM "user" u LEFT JOIN social_players s ON s.id = u.id WHERE u.id = $1`,
      [accountId],
    );
    if (!identity.rows[0]) throw new Error('Account no longer available.');
    const state = await client.query<{
      generation_id: string;
      revision: number;
      profile_created_at: string;
      progress: unknown;
      edits: unknown;
      edit_revisions: unknown;
    }>(
      'SELECT generation_id, revision, profile_created_at, progress, edits, edit_revisions FROM account_state WHERE id = $1',
      [accountId],
    );
    const service = await client.query<{ epoch: string }>(
      "SELECT epoch FROM service_state WHERE id = 'main'",
    );
    const header = {
      format: 'quizmon-account-export',
      version: formatVersions.accountExport,
      accountId,
      generationId: state.rows[0]?.generation_id ?? null,
      serverEpoch: service.rows[0]?.epoch ?? null,
      revision: state.rows[0]?.revision ?? null,
      snapshot: snapshot.rows[0]!.snapshot,
      exportedAt: snapshot.rows[0]!.exported_at.toISOString(),
      scope:
        'Retained server data. Unsynced changes remain on their originating devices and are included in browser backups.',
      account: identity.rows[0],
      state: state.rows[0] ?? null,
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
