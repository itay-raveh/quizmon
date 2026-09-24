import { DatabaseSync } from 'node:sqlite';
import { expect, it } from 'vitest';
import { completion } from '../../../tests/online/progress-fixtures';
import { archiveCompletion } from '../../domain/sync/round-facts';
import { applyRoundReceipt, readLocalRounds } from './game-history';
import type { LocalRow, LocalTransaction } from './local-database';

it('repairs old numeric receipts and keeps new receipts as JSON booleans', async () => {
  const database = new DatabaseSync(':memory:');
  database.exec(
    'CREATE TABLE local_completions (id TEXT PRIMARY KEY, payload TEXT)',
  );
  const round = archiveCompletion(completion(crypto.randomUUID(), 'daily'));
  const tx = {
    getAll: () =>
      Promise.resolve(
        database
          .prepare('SELECT id,payload FROM local_completions')
          .all() as unknown as LocalRow[],
      ),
    execute: (sql: string, params: unknown[]) =>
      Promise.resolve(
        database.prepare(sql).run(...(params as (string | number)[])),
      ),
  } as unknown as LocalTransaction;
  try {
    database
      .prepare('INSERT INTO local_completions(id,payload) VALUES (?,?)')
      .run(round.id, JSON.stringify(round));
    await tx.execute(
      "UPDATE local_completions SET payload = json_set(payload,'$.credited',?) WHERE id = ?",
      [0, round.id],
    );
    expect(
      JSON.parse((await tx.getAll<LocalRow>(''))[0]!.payload) as unknown,
    ).toMatchObject({ credited: 0 });
    expect((await readLocalRounds(tx))[0]!.credited).toBe(false);
    expect(
      JSON.parse((await tx.getAll<LocalRow>(''))[0]!.payload) as unknown,
    ).toMatchObject({ credited: false });

    await applyRoundReceipt(tx, round.id, true);
    expect(
      JSON.parse((await tx.getAll<LocalRow>(''))[0]!.payload) as unknown,
    ).toMatchObject({ credited: true });
    expect((await readLocalRounds(tx))[0]!.credited).toBe(true);
  } finally {
    database.close();
  }
});
