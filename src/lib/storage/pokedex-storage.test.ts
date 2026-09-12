import { catalog } from '../../../tests/fixtures/catalog';
import {
  emptyPlayerData,
  parsePlayerSave,
} from '../../domain/player/player-save';
import { generations } from '../../domain/pokemon/types';
import { buildQuestions } from '../../domain/quiz/question-generation';
import { getQuestionPokemon } from '../../domain/quiz/question-pokemon';
import { questionTypes } from '../../domain/quiz/questions/definitions';
import { isQuestionAnswerCorrect } from '../../domain/quiz/scoring';
import { type QuestionData, type QuestionType } from '../../domain/quiz/types';
import { defaultGameSettings } from '../../domain/settings/game-settings';
import {
  createBackup,
  parseBackup,
  restoreBackup,
} from '../../features/settings/backup';
import {
  parseTrainerRoute,
  setTrainerRoute,
} from '../../features/trainer/trainer-route';
import { createSeededRandom } from '../random';
import { PLAYER_STORAGE_KEY, readPlayerSave } from './player-storage';
import { registerPokedexAnswer } from './pokedex-storage';

const questionFor = (questionType: QuestionType) => {
  const [question] = buildQuestions(
    catalog,
    {
      ...defaultGameSettings,
      difficulty: undefined,
      generations: [...generations],
      questionTypes: [questionType],
    },
    createSeededRandom(`pokedex:${questionType}`),
    1,
  );
  expect(question?.questionType).toBe(questionType);
  return question!;
};

beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());

it.each(questionTypes)(
  'registers subjects and correct Pokémon choices for %s',
  (type) => {
    const question = questionFor(type);
    const expected = new Set([
      question.pokemonName,
      ...question.answer.correctOptions.filter((name) =>
        Object.hasOwn(catalog.pokemon, name),
      ),
    ]);
    if (question.visual?.kind === 'evolution-link') {
      expected.add(question.visual.before);
      expected.add(question.visual.after);
    }
    if (question.visual?.kind === 'evolution-shift')
      expected.add(question.visual.evolution.name);
    expect(new Set(getQuestionPokemon(question))).toEqual(expected);
    expect(registerPokedexAnswer(question, true)).toBe(true);
    expect(new Set(readPlayerSave().data.pokedex)).toEqual(expected);
    const writes = vi.spyOn(Storage.prototype, 'setItem');
    registerPokedexAnswer(question, true);
    expect(writes).not.toHaveBeenCalled();
  },
);

it('registers a Champion answer without crediting names mentioned in its clue', () => {
  const question: QuestionData = {
    ...questionFor('field-notes'),
    pokemonName: 'dondozo',
    questionType: 'champion',
    category: 'champion',
    answer: { interaction: 'single-choice', correctOptions: ['dondozo'] },
    prompt: { kind: 'text', text: 'It treats Tatsugiri like its boss.' },
  };
  registerPokedexAnswer(question, true);
  expect(readPlayerSave().data.pokedex).toEqual(['dondozo']);
});

it('does not register wrong or partially correct multi-select answers', () => {
  const question = questionFor('generation-roundup');
  for (const selected of [
    [],
    question.answer.correctOptions.slice(0, 1),
    question.options,
  ]) {
    registerPokedexAnswer(
      question,
      isQuestionAnswerCorrect(question, selected),
    );
  }
  expect(readPlayerSave().data.pokedex).toEqual([]);
});

it('persists before round completion and includes discoveries in backup replacement', () => {
  const first = questionFor('type-twins');
  registerPokedexAnswer(first, true);
  expect(readPlayerSave().data.results.progress.correctPokemon).toEqual([]);
  const backup = parseBackup(JSON.stringify(createBackup()));
  registerPokedexAnswer(questionFor('evolution-link'), true);
  restoreBackup(backup);
  expect(readPlayerSave().data.pokedex).toEqual(getQuestionPokemon(first));
});

it('migrates a version 1 save once, using only recorded correct Pokémon', () => {
  const data = emptyPlayerData();
  data.results.progress.correctPokemon = ['pikachu'];
  data.results.daily['2026-09-01'] = {
    answers: [
      {
        category: 'identity',
        correct: true,
        points: 1000,
        pokemonName: 'eevee',
      },
      { category: 'identity', correct: false, points: 0, pokemonName: 'ditto' },
      { category: 'identity', correct: true, points: 1000 },
    ],
    contentVersion: 1,
    correctCount: 2,
    elapsedSeconds: 12,
    questionCount: 3,
    score: 2000,
  };
  const raw = JSON.stringify({ version: 1, restoreId: null, data });
  localStorage.setItem(PLAYER_STORAGE_KEY, raw);
  const migrated = readPlayerSave();
  expect(migrated.version).toBe(4);
  expect(migrated.data.pokedex).toEqual(['pikachu', 'eevee']);
  expect(migrated.data.results).toEqual(data.results);
  expect(localStorage.getItem(PLAYER_STORAGE_KEY)).toBe(
    JSON.stringify(migrated),
  );
  expect(readPlayerSave()).toEqual(migrated);
});

it('leaves a version 1 document intact when migration cannot be written', () => {
  const data = emptyPlayerData();
  data.results.progress.correctPokemon = ['pikachu'];
  const raw = JSON.stringify({ version: 1, restoreId: null, data });
  localStorage.setItem(PLAYER_STORAGE_KEY, raw);
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new DOMException('Full', 'QuotaExceededError');
  });
  expect(readPlayerSave().data.pokedex).toEqual(['pikachu']);
  expect(localStorage.getItem(PLAYER_STORAGE_KEY)).toBe(raw);
  expect(registerPokedexAnswer(questionFor('evolution-link'), true)).toBe(
    false,
  );
  expect(localStorage.getItem(PLAYER_STORAGE_KEY)).toBe(raw);
});

it('rejects invalid collection data without overwriting the save', () => {
  const save = {
    version: 2,
    restoreId: null,
    data: { ...emptyPlayerData(), pokedex: ['pikachu', 42] },
  };
  expect(() => parsePlayerSave(save)).toThrow();
  const raw = JSON.stringify(save);
  localStorage.setItem(PLAYER_STORAGE_KEY, raw);
  expect(registerPokedexAnswer(questionFor('pokedex-scan'), true)).toBe(false);
  expect(localStorage.getItem(PLAYER_STORAGE_KEY)).toBe(raw);
});

it('opens Pokédex through the same Trainer routing as the other achievements', () => {
  expect(parseTrainerRoute('?trainer=pokedex')).toBe('pokedex');
  expect(
    setTrainerRoute(new URL('https://example.com/'), 'pokedex').search,
  ).toBe('?trainer=pokedex');
});
