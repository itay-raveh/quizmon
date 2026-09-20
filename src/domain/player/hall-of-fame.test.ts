import { completion } from '../../../tests/online/progress-fixtures.ts';
import { commitRoundCompletion } from '../../lib/storage/round-storage.ts';
import { catalog } from '../../../tests/fixtures/catalog.ts';
import {
  resetLocalSave,
  saveResult,
} from '../../../tests/fixtures/local-save.ts';
import {
  createBackup,
  parseBackup,
  restoreBackup,
} from '../../features/settings/backup.ts';
import {
  getPlayerDatabase,
  readPlayerSave,
} from '../../lib/storage/player-storage.ts';
import { readTrainerStats } from '../../lib/storage/results-storage.ts';
import { buildLeagueQuestions } from '../quiz/question-generation.ts';
import type { GameResult } from '../quiz/types.ts';
import { defaultGameSettings } from '../settings/game-settings.ts';
import { createLeagueVictoryRecord } from './hall-of-fame.ts';
import { emptyPlayerData, parsePlayerSave } from './player-save.ts';

beforeEach(resetLocalSave);

const questions = buildLeagueQuestions(
  catalog,
  'record-test',
  defaultGameSettings,
);
const result: GameResult = {
  answers: questions.map((q) => ({
    category: q.category,
    correct: true,
    points: 1000,
    questionType: q.questionType,
    cluesUsed: 0,
    subject: {
      kind: 'pokemon' as const,
      name: q.subject.name,
    },
  })),
  contentVersion: catalog.contentVersion,
  correctCount: 15,
  questionCount: 15,
  score: 42000,
  elapsedSeconds: 120,
};
const victory = (seed = 'record-test') =>
  createLeagueVictoryRecord(result, questions, seed, 'Leaf');
beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});
it('includes subjects, revealed evolutions and distractors but excludes types and hidden Champion choices', () => {
  const record = victory();
  for (const q of questions) {
    expect(record.pokemon).toContain(q.subject.name);
    for (const name of Object.keys(q.optionVisuals ?? {})) {
      if (q.questionType !== 'champion') expect(record.pokemon).toContain(name);
    }
    if (q.visual?.kind === 'evolution-shift')
      expect(record.pokemon).toContain(q.visual.evolution.name);
  }
  expect(record.pokemon.length).toBeGreaterThan(15);
  expect(new Set(record.pokemon).size).toBe(record.pokemon.length);
  expect(
    record.pokemon.every((name) => Object.hasOwn(catalog.pokemon, name)),
  ).toBe(true);
  const champion = questions.at(-1)!;
  const championRecord = createLeagueVictoryRecord(
    { ...result, answers: [result.answers.at(-1)!] },
    [champion],
    'champion',
    'Leaf',
  );
  expect(championRecord.pokemon).toEqual([champion.subject.name]);
});

it('keeps every distinct victory and deduplicates a restored completion without crediting progress twice', async () => {
  const first = victory();
  await saveResult({ kind: 'league' }, result, defaultGameSettings, first);
  const stats = readTrainerStats();
  await saveResult({ kind: 'league' }, result, defaultGameSettings, first);
  expect(readTrainerStats()).toEqual(stats);
  expect(readPlayerSave().data.hallOfFame).toEqual([first]);
  const second = victory('rematch');
  await saveResult({ kind: 'league' }, result, defaultGameSettings, second);
  expect(readPlayerSave().data.hallOfFame).toEqual([first, second]);
});

it('round-trips all victory records through backup and replacement restore', async () => {
  for (let index = 0; index < 2; index++)
    await commitRoundCompletion(
      completion(crypto.randomUUID(), 'league', {
        completedAt: `2026-09-${11 + index}T10:00:00.000Z`,
      }),
    );
  const expected = readPlayerSave().data.hallOfFame;
  const backup = parseBackup(JSON.stringify(await createBackup()));
  localStorage.clear();
  await restoreBackup(backup);
  expect(readPlayerSave().version).toBe(7);
  expect(readPlayerSave().data.hallOfFame).toEqual(expected);
});

it.each([
  { completedAt: '2026-02-31T12:00:00.000Z' },
  { pokemon: ['pikachu', 'pikachu'] },
  { pokemon: [] },
  { trainerName: 'A'.repeat(21) },
  { result: { ...result, correctCount: 14 } },
  { result: { ...result, score: -1 } },
])(
  'rejects a malformed record instead of silently deleting it: %j',
  (patch) => {
    const data = {
      ...emptyPlayerData(),
      hallOfFame: [{ ...victory(), ...patch }],
    };
    expect(() =>
      parsePlayerSave({ version: 7, restoreId: null, data }),
    ).toThrow('invalid progress');
  },
);
it('accepts a victory with a 20-character Trainer name', () => {
  const record = { ...victory(), trainerName: 'A'.repeat(20) };
  const saved = parsePlayerSave({
    version: 7,
    restoreId: null,
    data: { ...emptyPlayerData(), hallOfFame: [record] },
  });
  expect(saved.data.hallOfFame).toEqual([record]);
});

it('leaves existing victories intact if a transaction fails', async () => {
  await saveResult(
    { kind: 'league' },
    result,
    defaultGameSettings,
    createLeagueVictoryRecord(result, questions, 'first', 'Leaf'),
  );
  const before = readPlayerSave();
  const db = getPlayerDatabase();
  const run = db.writeTransaction.bind(db);
  vi.spyOn(db, 'writeTransaction').mockImplementation((callback) =>
    run(async (tx) => {
      await callback(tx);
      throw new Error('Storage full');
    }),
  );
  await expect(
    saveResult(
      { kind: 'league' },
      result,
      defaultGameSettings,
      createLeagueVictoryRecord(result, questions, 'second', 'Leaf'),
    ),
  ).rejects.toThrow('Storage full');
  vi.restoreAllMocks();
  expect(readPlayerSave()).toEqual(before);
});
