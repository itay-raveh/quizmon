import { expect, test } from 'vitest';
import { completion } from '../tests/online/progress-fixtures.ts';
import { archiveCompletion } from '../src/domain/sync/round-facts.ts';
import type { PlayerDatabase } from '../src/lib/storage/rxdb-database.ts';
import { boardRows } from './rxdb-read.ts';

test('Daily ranks only the requested puzzle while showing other versions', async () => {
  const first = archiveCompletion(completion('daily'));
  const second = archiveCompletion(completion('daily'));
  second.puzzle_id = 'b'.repeat(64);
  const rounds = [
    { id: first.id, ownerId: 'first', fact: first },
    { id: second.id, ownerId: 'second', fact: second },
  ];
  const db = {
    rounds: { find: () => ({ exec: () => Promise.resolve(rounds) }) },
  } as unknown as PlayerDatabase;

  const firstBoard = await boardRows(
    db,
    'daily',
    null,
    '2026-09-11',
    'a'.repeat(64),
    true,
  );
  expect(
    firstBoard.map(({ playerId, rank, comparable }) => ({
      playerId,
      rank,
      comparable,
    })),
  ).toEqual([
    { playerId: 'first', rank: 1, comparable: true },
    { playerId: 'second', rank: null, comparable: false },
  ]);

  const secondBoard = await boardRows(
    db,
    'daily',
    null,
    '2026-09-11',
    'b'.repeat(64),
    true,
  );
  expect(secondBoard.map((row) => [row.playerId, row.rank])).toEqual([
    ['second', 1],
    ['first', null],
  ]);

  expect(
    await boardRows(db, 'daily', null, '2026-09-11', 'a'.repeat(64)),
  ).toHaveLength(1);
});
