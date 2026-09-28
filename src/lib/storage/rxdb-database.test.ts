import { describe, expect, it } from 'vitest';
import { IDBKeyRange, indexedDB } from 'fake-indexeddb';
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';
import { createRxDatabase } from 'rxdb/plugins/core';
import type { RxCollection } from 'rxdb';
import { createTrainerProfile } from '../../domain/player/trainer-profile';
import { openPlayerDatabase } from './rxdb-database';
import { deviceSchema, playerSchema, roundSchema } from './rxdb-schema';
import { defaultGameSettings } from '../../domain/settings/game-settings';
import { archiveCompletion } from '../../domain/sync/round-facts';
import { completion } from '../../../tests/online/progress-fixtures';
import { readGameData } from './rxdb-game';

describe('RxDB IndexedDB persistence', () => {
  it('reopens a device save without losing the record', async () => {
    const name = `quizmon_test_${crypto.randomUUID().replaceAll('-', '')}`;
    const storage = getRxStorageDexie({ indexedDB, IDBKeyRange });
    const first = await openPlayerDatabase(name, storage, false);
    await first.device.insert({ id: 'state', payload: { rounds: 3 } });
    await first.players.insert({
      id: 'guest',
      ownerId: 'guest',
      profile: createTrainerProfile(),
      settings: null,
    });
    await first.close();

    const second = await openPlayerDatabase(name, storage, false);
    expect((await second.device.findOne('state').exec())?.payload).toEqual({
      rounds: 3,
    });
    expect((await second.players.findOne('guest').exec())?.profile.name).toBe(
      '',
    );
    await second.remove();
  });

  it('replays an ordered migration for an existing IndexedDB record', async () => {
    const name = `quizmon_test_${crypto.randomUUID().replaceAll('-', '')}`;
    const storage = getRxStorageDexie({ indexedDB, IDBKeyRange });
    const first = await createRxDatabase<{
      players: RxCollection;
      rounds: RxCollection;
      device: RxCollection;
    }>({ name, storage, multiInstance: false });
    const old = await first.addCollections({
      players: { schema: { ...playerSchema, version: 0 } },
      rounds: { schema: { ...roundSchema, version: 0 } },
      device: { schema: { ...deviceSchema, version: 0 } },
    });
    const fact = archiveCompletion(completion('training'));
    fact.data.config.question_types = ['pokemon-types' as never];
    fact.data.config.auto_types = ['pokemon-types' as never];
    fact.data.answers[0]!.question_type = 'pokemon-types' as never;
    await old.rounds.insert({ id: fact.id, ownerId: 'guest', fact });
    await old.players.insert({
      id: 'guest',
      ownerId: 'guest',
      profile: createTrainerProfile(),
      settings: {
        ...defaultGameSettings,
        questionTypes: ['pokemon-types'],
      },
    });
    const active = {
      roundId: crypto.randomUUID(),
      seed: 'migration',
      questionCount: 1,
      elapsedMilliseconds: 0,
      answers: [],
      questions: [
        {
          id: 'pokemon-types:pokemon:Pikachu',
          questionType: 'pokemon-types',
          category: 'knowledge',
          subject: {
            kind: 'pokemon',
            name: 'Pikachu',
            generation: 'I',
            types: ['Electric'],
          },
          repetition: {
            identity: 'Pikachu',
            subjects: [],
            primary: [],
            distractors: [],
          },
          options: ['Electric', 'Normal'],
          answer: {
            interaction: 'single-choice',
            correctOptions: ['Electric'],
          },
          prompt: { kind: 'text', text: 'Type?' },
          media: { kind: 'none' },
          visual: { kind: 'pokemon-types' },
        },
      ],
      mode: { kind: 'training' },
      settings: { ...defaultGameSettings, questionTypes: ['pokemon-types'] },
    };
    await old.device.insert({ id: 'round:tab', payload: active });
    await old.device.insert({
      id: 'state',
      payload: {
        restoreId: null,
        dailyAttempts: {},
        questionHistory: {
          sequence: 1,
          subjects: { 'pokemon-types:Pikachu': 1 },
          questions: { 'pokemon-types:Pikachu': 1 },
          pokemon: {},
          distractors: {},
          rounds: {},
        },
      },
    });
    await first.close();

    const second = await openPlayerDatabase(name, storage, false);
    try {
      const migrated = await readGameData(second, 'guest');
      expect(
        migrated.data.results.progress.correctQuestionTypes.pokemonTypes,
      ).toBeGreaterThan(0);
      expect(migrated.data.settings?.questionTypes).toContain('pokemonTypes');
      expect(migrated.device.questionHistory.subjects).toEqual({
        'pokemonTypes:Pikachu': 1,
      });
      const resumed = (await second.device.findOne('round:tab').exec())
        ?.payload;
      expect(resumed).toMatchObject({
        questions: [
          {
            id: 'pokemonTypes:pokemon:Pikachu',
            questionType: 'pokemonTypes',
            visual: { kind: 'pokemonTypes' },
          },
        ],
      });
    } finally {
      await second.remove();
    }
  });
});
