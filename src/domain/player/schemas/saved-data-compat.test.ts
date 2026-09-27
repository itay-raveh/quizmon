import { isQuestionData } from '../../quiz/question-lineup';
import { completion } from '../../../../tests/online/progress-fixtures';
import { defaultGameSettings } from '../../settings/game-settings';
import { emptyPlayerData } from '../player-save';
import { parseActiveGameSave } from '../active-game';
import { SaveError } from '../save-schema';
import { parseRound } from './round';
import { parsePlayerData } from './player-data';

const question = {
  id: 'q',
  questionType: 'type-check',
  category: 'knowledge',
  subject: { kind: 'pokemon', name: 'A', generation: 'I', types: [] },
  repetition: { identity: 'A', subjects: [], primary: [], distractors: [] },
  options: ['A'],
  answer: { interaction: 'single-choice', correctOptions: ['A'] },
  prompt: { kind: 'text', text: 'A?' },
  media: { kind: 'none' },
};
const round = {
  elapsedMilliseconds: 0,
  questionCount: 1,
  roundId: crypto.randomUUID(),
  seed: 's',
  answers: [],
  questions: [question],
  mode: { kind: 'training' },
  settings: defaultGameSettings,
};

it('keeps saved question acceptance and required option invariants', () => {
  expect(isQuestionData({ ...question, futureField: true })).toBe(true);
  expect(isQuestionData({ ...question, questionType: 'evolution-items' })).toBe(
    false,
  );
  expect(isQuestionData({ ...question, options: ['A', 'A'] })).toBe(false);
  expect(
    isQuestionData({
      ...question,
      media: { kind: 'pixel-peek', src: '', focusX: Infinity, focusY: 0 },
    }),
  ).toBe(false);
});

it('preserves unfinished-round output and unknown settings', () => {
  const saved = {
    ...round,
    extra: 1,
    settings: { ...defaultGameSettings, futureField: 1 },
  };
  expect(parseRound(saved)).toEqual({
    ...round,
    settings: saved.settings,
    playerRestoreId: null,
  });
  expect(parseRound({ ...round, version: 2 })).not.toBeNull();
  expect(parseRound({ ...round, questionCount: 2 })).toBeNull();
  expect(
    parseRound({
      ...round,
      questions: [
        {
          ...question,
          subject: { ...question.subject, types: 'fire' },
        },
      ],
    }),
  ).toBeNull();
});

it('loads an unfinished round with a retired question without offering it again', () => {
  const saved = {
    ...round,
    questions: [{ ...question, questionType: 'evolution-items' }],
    settings: {
      ...defaultGameSettings,
      questionTypes: ['evolution-items'],
      automaticQuestionTypes: ['evolution-items'],
    },
  };
  const restored = parseRound(saved);
  expect(restored?.questions[0]?.questionType).toBe('archived');
  expect(restored?.questions[0]?.prompt).toEqual(question.prompt);
  expect(restored?.settings.questionTypes).toEqual(
    defaultGameSettings.questionTypes,
  );
  expect(restored?.settings.automaticQuestionTypes).toEqual([]);
});

it('rejects unsafe saved round counts', () => {
  expect(parseRound(round)).not.toBeNull();
  expect(parseRound({ ...round, roundId: round.seed })).toBeNull();
  expect(
    parseRound({ ...round, questionCount: Number.MAX_SAFE_INTEGER + 1 }),
  ).toBeNull();
});

it('rejects unfinished rounds without a stable round ID', () => {
  expect(() => parseActiveGameSave({ ...round, roundId: round.seed })).toThrow(
    SaveError,
  );
  expect(() => parseActiveGameSave({ ...round, roundId: undefined })).toThrow(
    SaveError,
  );
});

it('keeps player-data normalization and recovery error category', () => {
  const base = emptyPlayerData();
  expect(parsePlayerData({ ...base, pokedex: ['A', 'A'] }).pokedex).toEqual([
    'A',
  ]);
  expect(() => parsePlayerData({ ...base, profile: {} })).toThrow(
    'This save contains an invalid Trainer profile.',
  );
  try {
    parsePlayerData({ ...base, results: null });
  } catch (error) {
    expect(error).toBeInstanceOf(SaveError);
    expect((error as SaveError).kind).toBe('invalid');
    return;
  }
  throw new Error('Expected invalid save');
});

it('deduplicates saved selections before they become game settings', () => {
  const parsed = parsePlayerData({
    ...emptyPlayerData(),
    settings: {
      ...defaultGameSettings,
      generations: ['IX', 'I', 'IX'],
      questionTypes: ['stat-showdown', 'type-check', 'stat-showdown'],
      automaticQuestionTypes: ['type-check'],
    },
  });
  expect(parsed.settings?.generations).toEqual(['I', 'IX']);
  expect(parsed.settings?.questionTypes).toEqual([
    'type-check',
    'stat-showdown',
  ]);
  expect(parsed.settings?.automaticQuestionTypes).toEqual(['type-check']);
});

it('keeps historical scores and counts while filtering retired settings', () => {
  const base = emptyPlayerData();
  const result = structuredClone(completion().result);
  Reflect.set(result.answers[0]!, 'questionType', 'evolution-items');
  result.rules!.questionTypes = ['evolution-items'];
  result.scoreMultipliers!.questionTypes[0]!.questionType = 'evolution-items';
  const parsed = parsePlayerData({
    ...base,
    settings: {
      ...defaultGameSettings,
      questionTypes: ['evolution-items', 'type-check'],
    },
    results: {
      ...base.results,
      progress: {
        ...base.results.progress,
        correctQuestionTypes: { 'evolution-items': 7 },
      },
      training: { score: result },
    },
  });
  expect(parsed.settings?.questionTypes).toEqual(['type-check']);
  expect(parsed.results.progress.correctQuestionTypes['evolution-items']).toBe(
    7,
  );
  expect(parsed.results.training.score?.score).toBe(result.score);
});

it('accepts sparse saved counts and rejects unknown count keys', () => {
  const base = emptyPlayerData();
  const progress = {
    ...base.results.progress,
    correctCategories: { ability: 1 },
    correctGenerations: { I: 2 },
    correctQuestionTypes: {},
  };
  const results = { ...base.results, progress };
  expect(parsePlayerData({ ...base, results }).results.progress).toMatchObject(
    progress,
  );
  expect(() =>
    parsePlayerData({
      ...base,
      results: {
        ...results,
        progress: { ...progress, correctCategories: { unknown: 1 } },
      },
    }),
  ).toThrow(SaveError);
  expect(() =>
    parsePlayerData({
      ...base,
      results: {
        ...results,
        progress: {
          ...progress,
          correctQuestionTypes: Object.fromEntries(
            Array.from({ length: 201 }, (_, index) => [`old-${index}`, 1]),
          ),
        },
      },
    }),
  ).toThrow(SaveError);
});
