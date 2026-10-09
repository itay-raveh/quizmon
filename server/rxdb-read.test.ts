import { IDBKeyRange, indexedDB } from 'fake-indexeddb';
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';
import { expect, test } from 'vitest';
import { createTrainerProfile } from '../src/domain/player/trainer-profile.ts';
import { LEAGUE_QUESTION_COUNT } from '../src/domain/quiz/league.ts';
import { openPlayerDatabase } from '../src/lib/storage/rxdb-database.ts';
import { playerProfiles, trainerProfile } from './rxdb-read.ts';

test('public player profiles mark only perfect League winners as Champions', async () => {
  const db = await openPlayerDatabase(
    `champion_test_${crypto.randomUUID().replaceAll('-', '')}`,
    getRxStorageDexie({ indexedDB, IDBKeyRange }),
    false,
  );
  try {
    const answer = () => ({
      type: 'pokemonFromHistoricalSprite' as const,
      subject: 'pikachu',
      expected: ['pikachu'],
      selected: ['pikachu'],
      responseMs: 1000,
    });
    const victory = {
      id: '00000000-0000-4000-8000-000000000001',
      mode: 'league' as const,
      completedAt: '2026-10-02T00:00:00.000Z',
      answers: Array.from({ length: LEAGUE_QUESTION_COUNT }, answer),
    };
    const ids = ['winner', 'runner-up', 'never-played'];
    await db.players.bulkInsert(
      ids.map((id) => ({
        id,
        profile: { ...createTrainerProfile(), name: id },
        settings: null,
      })),
    );
    await db.rounds.bulkInsert([
      { ownerId: 'winner', ...victory },
      {
        ownerId: 'runner-up',
        ...victory,
        id: '00000000-0000-4000-8000-000000000002',
        answers: [
          ...victory.answers.slice(1),
          { ...answer(), selected: ['eevee'] },
        ],
      },
    ]);

    const profiles = await playerProfiles(db, ids);

    expect(profiles.map(({ leagueCompleted }) => leagueCompleted)).toEqual([
      true,
      false,
      false,
    ]);
    for (const { id, leagueCompleted } of profiles) {
      const trainer = await trainerProfile(db, id);
      expect(trainer.player.leagueCompleted).toBe(leagueCompleted);
      expect(trainer.player.name).toBe(id);
      expect(trainer.stats.leagueCompleted).toBe(leagueCompleted);
    }
  } finally {
    await db.remove();
  }
});
