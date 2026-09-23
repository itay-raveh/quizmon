import type { Client } from 'pg';
import { scoreRound, type RoundFact } from '../src/domain/sync/round-facts.ts';

export async function rebuildRoundScores(client: Client) {
  await client.query('BEGIN');
  try {
    await client.query('LOCK TABLE round IN SHARE MODE');
    await client.query('LOCK TABLE round_score IN SHARE ROW EXCLUSIVE MODE');
    const rows = await client.query<{
      id: string;
      mode: RoundFact['mode'];
      puzzle_id: string | null;
      data: RoundFact['data'];
    }>('SELECT id,mode,puzzle_id,data FROM round ORDER BY id');
    for (const row of rows.rows) {
      const result = scoreRound(row);
      await client.query(
        `INSERT INTO round_score(round_id,score,elapsed_ms) VALUES ($1,$2,$3)
        ON CONFLICT (round_id) DO UPDATE SET score=excluded.score,elapsed_ms=excluded.elapsed_ms`,
        [row.id, result.score, result.elapsedMilliseconds ?? 0],
      );
    }
    await client.query(
      'DELETE FROM round_score WHERE round_id NOT IN (SELECT id FROM round)',
    );
    const counts = await client.query<{ rounds: string; scores: string }>(
      'SELECT (SELECT count(*) FROM round)::text AS rounds,(SELECT count(*) FROM round_score)::text AS scores',
    );
    if (counts.rows[0]?.rounds !== counts.rows[0]?.scores)
      throw new Error('Round score cache count differs from the archive.');
    await client.query('COMMIT');
    return rows.rowCount;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}
