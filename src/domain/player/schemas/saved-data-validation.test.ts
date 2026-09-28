import { isQuestionData } from '../../quiz/lineup';
import { completion } from '../../../../tests/online/progress-fixtures';
import { defaultGameSettings } from '../../settings/game-settings';
import { emptyPlayerData } from '../player-save';
import { parseActiveGameSave } from '../active-game';
import { SaveError } from '../save-schema';
import { parseRound } from './round';
import { parsePlayerData } from './player-data';

const question = {
  id: 'q',
  questionType: 'pokemonTypes',
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
  expect(isQuestionData({ ...question, questionType: 'missing-type' })).toBe(
    false,
  );
  expect(isQuestionData({ ...question, options: ['A', 'A'] })).toBe(false);
  expect(
    isQuestionData({
      ...question,
      media: {
        kind: 'pokemonFromPixelCrop',
        src: '',
        focusX: Infinity,
        focusY: 0,
      },
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

it('discards an unfinished round with a retired question', () => {
  const saved = {
    ...round,
    questions: [{ ...question, questionType: 'missing-type' }],
    settings: {
      ...defaultGameSettings,
      questionTypes: ['missing-type'],
      automaticQuestionTypes: ['missing-type'],
    },
  };
  expect(parseRound(saved)).toBeNull();
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
      questionTypes: ['statExtremes', 'pokemonTypes', 'statExtremes'],
      automaticQuestionTypes: ['pokemonTypes'],
    },
  });
  expect(parsed.settings?.generations).toEqual(['I', 'IX']);
  expect(parsed.settings?.questionTypes).toEqual([
    'pokemonTypes',
    'statExtremes',
  ]);
  expect(parsed.settings?.automaticQuestionTypes).toEqual(['pokemonTypes']);
});

it('rejects saved results and settings that use retired question IDs', () => {
  const base = emptyPlayerData();
  const result = structuredClone(completion().result);
  Reflect.set(result.answers[0]!, 'questionType', 'missing-type');
  Reflect.set(result.rules!, 'questionTypes', ['missing-type']);
  Reflect.set(
    result.scoreMultipliers!.questionTypes[0]!,
    'questionType',
    'missing-type',
  );
  const saved = {
    ...base,
    settings: {
      ...defaultGameSettings,
      questionTypes: ['missing-type', 'pokemonTypes'],
    },
    results: {
      ...base.results,
      progress: {
        ...base.results.progress,
        correctQuestionTypes: { 'missing-type': 7 },
      },
      training: { score: result },
    },
  };
  expect(() => parsePlayerData(saved)).toThrow(SaveError);
  expect(() =>
    parsePlayerData({ ...saved, settings: defaultGameSettings }),
  ).toThrow(SaveError);
});

it('keeps current champion answers in saved results', () => {
  const base = emptyPlayerData();
  const parsed = parsePlayerData({
    ...base,
    results: {
      ...base.results,
      training: { score: completion('league').result },
    },
  });
  expect(parsed.results.training.score?.answers.at(-1)?.questionType).toBe(
    'champion',
  );
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
