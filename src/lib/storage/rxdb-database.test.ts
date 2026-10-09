import { createRxDatabase } from 'rxdb/plugins/core';
import {
  deviceSchema,
  playerSchema,
  roundSchema,
  type SyncedRound,
} from './rxdb-schema';
import {
  migrateDeviceV1,
  migratePlayerV1,
  migrateRoundV1,
} from './rxdb-migrations';
import { describe, expect, it } from 'vitest';
import { IDBKeyRange, indexedDB } from 'fake-indexeddb';
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';
import {
  legacyProgress,
  openLegacyDatabase,
} from '../../../tests/legacy-progress';
import { scoreCompactRound } from '../../domain/sync/compact-rounds';
import { readGameData, writeCompletedRound } from './rxdb-game';
import { parseRound } from '../../domain/player/schemas/round';
import { createTrainerProfile } from '../../domain/player/trainer-profile';
import { openPlayerDatabase } from './rxdb-database';

describe('RxDB IndexedDB persistence', () => {
  it('reopens a device save without losing the record', async () => {
    const name = `quizmon_test_${crypto.randomUUID().replaceAll('-', '')}`;
    const storage = getRxStorageDexie({ indexedDB, IDBKeyRange });
    const first = await openPlayerDatabase(name, storage, false);
    await first.device.insert({ id: 'state', payload: { rounds: 3 } });
    await first.players.insert({
      id: 'guest',
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
});

it('natively upgrades stored facts, preferences and completed receipts before opening, then replays idempotently', async () => {
  const name = `quizmon_migration_${crypto.randomUUID().replaceAll('-', '')}`;
  const storage = getRxStorageDexie({ indexedDB, IDBKeyRange });
  const fixture = legacyProgress();
  const old = await openLegacyDatabase(name, storage);
  await old.rounds.insert(fixture.legacy);
  await old.players.insert(fixture.player);
  await old.device.insert({
    id: 'state',
    payload: {
      restoreId: null,
      dailyAttempts: {
        '2026-09-27': {
          ...fixture.snapshot,
          completedAt: undefined,
          mode: { kind: 'daily', date: '2026-09-27' },
          questions: [],
        },
      },
    },
  });
  await old.device.insert({ id: 'round:tab', payload: fixture.snapshot });
  const raw = (await old.rounds
    .findOne(fixture.legacy.id)
    .exec())!.toMutableJSON(true);
  await old.close();
  let db = await openPlayerDatabase(name, storage, false);
  try {
    const migrated = (await db.rounds
      .findOne(fixture.legacy.id)
      .exec())!.toMutableJSON(true);
    expect(migrated).toEqual({ ...raw, answers: fixture.current.answers });
    expect(scoreCompactRound(migrated)).toEqual(
      scoreCompactRound(fixture.current),
    );
    expect(scoreCompactRound(migrated).correctCount).toBeGreaterThan(0);
    const { data, device } = await readGameData(db, 'guest');
    expect(data.profile).toEqual(fixture.player.profile);
    expect(data.settings?.questionTypes).toEqual([
      'pokemonIdentification',
      'pokemonMatch',
      'pokemonTypes',
    ]);
    expect(data.settings?.automaticQuestionTypes).toEqual([
      'pokemonMatch',
      'pokemonTypes',
    ]);
    expect(device.dailyAttempts['2026-09-27']).toBe(true);
    const saved = (await db.device.findOne('round:tab').exec())!.payload;
    const parsed = parseRound(saved);
    expect(parsed).not.toBeNull();
    expect(
      parsed?.answers.map((answer) => answer.observation?.selected),
    ).toEqual(
      fixture.snapshot.answers.map((answer) => answer.observation.selected),
    );
    expect(parsed?.questions.map((question) => question.media)).toEqual(
      fixture.snapshot.questions.map((question) => question.media),
    );
    expect(await writeCompletedRound(db, 'guest', fixture.current)).toBe(false);
    await db.close();
    db = await openPlayerDatabase(name, storage, false);
    expect(
      (await db.rounds.findOne(fixture.current.id).exec())!.toMutableJSON(true),
    ).toEqual(migrated);
    expect(await writeCompletedRound(db, 'guest', fixture.current)).toBe(false);
    const changed = structuredClone(fixture.current);
    changed.answers[0]!.selected = ['different'];
    await expect(writeCompletedRound(db, 'guest', changed)).rejects.toThrow(
      'different saved result',
    );
  } finally {
    await db.remove();
  }
});

it('retains an unreadable completed receipt when native migration cannot validate it', async () => {
  const name = `quizmon_migration_recovery_${crypto.randomUUID().replaceAll('-', '')}`;
  const storage = getRxStorageDexie({ indexedDB, IDBKeyRange });
  const old = await openLegacyDatabase(name, storage);
  const receipt = { ...legacyProgress().snapshot, questions: [] };
  await old.device.insert({ id: 'round:tab', payload: receipt });
  await old.close();
  await expect(openPlayerDatabase(name, storage, false)).rejects.toThrow();
  const recovered = await openLegacyDatabase(name, storage);
  try {
    expect(
      (await recovered.device.findOne('round:tab').exec())!.payload,
    ).toEqual(receipt);
  } finally {
    await recovered.remove();
  }
});

it('resumes an interrupted native migration without changing facts already copied to the new store', async () => {
  const name = `quizmon_migration_resume_${crypto.randomUUID().replaceAll('-', '')}`;
  const storage = getRxStorageDexie({ indexedDB, IDBKeyRange });
  const old = await openLegacyDatabase(name, storage);
  const fixtures = Array.from({ length: 12 }, () => legacyProgress());
  await old.rounds.bulkInsert(fixtures.map((fixture) => fixture.legacy));
  await old.close();
  const interrupted: Awaited<ReturnType<typeof openPlayerDatabase>> =
    await createRxDatabase({ name, storage, multiInstance: false });
  const entered = Promise.withResolvers<void>();
  const release = Promise.withResolvers<void>();
  let migrated = 0;
  await interrupted.addCollections({
    players: {
      schema: playerSchema,
      migrationStrategies: { 1: migratePlayerV1 },
    },
    device: {
      schema: deviceSchema,
      migrationStrategies: { 1: migrateDeviceV1 },
    },
    rounds: {
      schema: roundSchema,
      autoMigrate: false,
      migrationStrategies: {
        1: async (doc: SyncedRound) => {
          if (++migrated === 11) {
            entered.resolve();
            await release.promise;
          }
          return migrateRoundV1(doc);
        },
      },
    },
  });
  const running = interrupted.rounds.migratePromise(10);
  const settled = running.catch(() => undefined);
  await entered.promise;
  expect((await interrupted.rounds.find().exec()).length).toBe(10);
  await expect(
    interrupted.rounds.insert(legacyProgress().current),
  ).rejects.toThrow();
  const closing = interrupted.close();
  release.resolve();
  await closing;
  await settled;
  const resumed = await openPlayerDatabase(name, storage, false);
  try {
    const facts = (await resumed.rounds.find().exec())
      .map((doc) => doc.toMutableJSON())
      .sort((a, b) => a.id.localeCompare(b.id));
    expect(facts).toEqual(
      fixtures
        .map((fixture) => fixture.current)
        .sort((a, b) => a.id.localeCompare(b.id)),
    );
  } finally {
    await resumed.remove();
  }
});
