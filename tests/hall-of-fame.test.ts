import { catalog } from './fixtures/catalog';
import { createBackup, parseBackup, restoreBackup } from '@/game/backup';
import { defaultModifiers } from '@/game/modifiers';
import { createLeagueVictoryRecord } from '@/game/hall-of-fame';
import { buildLeagueQuestions } from '@/game/game';
import { emptyPlayerData, parsePlayerSave } from '@/game/player-data';
import { PLAYER_STORAGE_KEY, readPlayerSave } from '@/game/player-storage';
import { readTrainerStats, saveResult } from '@/game/storage';
import type { GameResult } from '@/game/types';

const questions = buildLeagueQuestions(
  catalog,
  'record-test',
  defaultModifiers,
);
const result: GameResult = {
  answers: questions.map((q) => ({
    category: q.category,
    correct: true,
    points: 1000,
    pokemonName: q.pokemonName,
    questionType: q.questionType,
    cluesUsed: 0,
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
    expect(record.pokemon).toContain(q.pokemonName);
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
  expect(championRecord.pokemon).toEqual([champion.pokemonName]);
});

it('keeps every distinct victory and deduplicates a restored completion without crediting progress twice', () => {
  const first = victory();
  expect(
    saveResult({ kind: 'league' }, result, defaultModifiers, first).isSaved,
  ).toBe(true);
  const stats = readTrainerStats();
  saveResult({ kind: 'league' }, result, defaultModifiers, first);
  expect(readTrainerStats()).toEqual(stats);
  expect(readPlayerSave().data.hallOfFame).toEqual([first]);
  const second = victory('rematch');
  saveResult({ kind: 'league' }, result, defaultModifiers, second);
  expect(readPlayerSave().data.hallOfFame).toEqual([first, second]);
});

it('round-trips all victory records through backup and replacement restore', () => {
  const first = victory();
  const second = victory('rematch');
  for (const record of [first, second])
    saveResult({ kind: 'league' }, result, defaultModifiers, record);
  const backup = parseBackup(JSON.stringify(createBackup()));
  localStorage.clear();
  restoreBackup(backup);
  expect(readPlayerSave().version).toBe(3);
  expect(readPlayerSave().data.hallOfFame).toEqual([first, second]);
});

it('migrates version 2 without fabricating old victory records or losing Champion status', () => {
  const data = emptyPlayerData();
  data.results.league.completed = true;
  data.pokedex = ['pikachu'];
  const oldData = Object.fromEntries(
    Object.entries(data).filter(([key]) => key !== 'hallOfFame'),
  );
  localStorage.setItem(
    PLAYER_STORAGE_KEY,
    JSON.stringify({ version: 2, restoreId: null, data: oldData }),
  );
  expect(readPlayerSave()).toMatchObject({
    version: 3,
    data: {
      hallOfFame: [],
      pokedex: ['pikachu'],
      results: { league: { completed: true } },
    },
  });
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
      parsePlayerSave({ version: 3, restoreId: null, data }),
    ).toThrow('invalid progress');
  },
);

it('accepts a victory with a 20-character Trainer name', () => {
  const record = { ...victory(), trainerName: 'A'.repeat(20) };
  const saved = parsePlayerSave({
    version: 3,
    restoreId: null,
    data: { ...emptyPlayerData(), hallOfFame: [record] },
  });
  expect(saved.data.hallOfFame).toEqual([record]);
});

it('leaves existing victories intact if saving a new victory fails', () => {
  saveResult({ kind: 'league' }, result, defaultModifiers, victory());
  const previous = localStorage.getItem(PLAYER_STORAGE_KEY);
  const write = vi
    .spyOn(Storage.prototype, 'setItem')
    .mockImplementation(() => {
      throw new DOMException('Full', 'QuotaExceededError');
    });
  expect(
    saveResult({ kind: 'league' }, result, defaultModifiers, victory('next'))
      .isSaved,
  ).toBe(false);
  write.mockRestore();
  expect(localStorage.getItem(PLAYER_STORAGE_KEY)).toBe(previous);
});
