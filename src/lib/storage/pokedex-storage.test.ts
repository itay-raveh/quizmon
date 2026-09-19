import { catalog } from '../../../tests/fixtures/catalog';
import { resetLocalSave } from '../../../tests/fixtures/local-save';
import {
  emptyPlayerData,
  parsePlayerSave,
} from '../../domain/player/player-save';
import { generations } from '../../domain/pokemon/types';
import { buildQuestions } from '../../domain/quiz/question-generation';
import { getQuestionPokemon } from '../../domain/quiz/question-pokemon';
import { standardQuestionTypes as questionTypes } from '../../domain/quiz/standard-question-types';
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
import { readPlayerSave } from './player-storage';
import { registerPokedexAnswer } from './pokedex-storage';

beforeEach(resetLocalSave);

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
  async (type) => {
    const question = questionFor(type);
    const expected = new Set([
      question.subject.name,
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
    expect(await registerPokedexAnswer(question, true)).toBe(true);
    expect(new Set(readPlayerSave().data.pokedex)).toEqual(expected);
    const saved = readPlayerSave();
    await registerPokedexAnswer(question, true);
    expect(readPlayerSave()).toEqual(saved);
  },
);

it('registers a Champion answer without crediting names mentioned in its clue', async () => {
  const question: QuestionData = {
    ...questionFor('field-notes'),
    questionType: 'champion',
    category: 'champion',
    answer: { interaction: 'single-choice', correctOptions: ['dondozo'] },
    prompt: { kind: 'text', text: 'It treats Tatsugiri like its boss.' },
    subject: {
      ...questionFor('field-notes').subject,
      kind: 'pokemon' as const,
      name: 'dondozo',
    },
  };
  await registerPokedexAnswer(question, true);
  expect(readPlayerSave().data.pokedex).toEqual(['dondozo']);
});

it('does not register wrong or partially correct multi-select answers', async () => {
  const question = questionFor('generation-roundup');
  for (const selected of [
    [],
    question.answer.correctOptions.slice(0, 1),
    question.options,
  ]) {
    await registerPokedexAnswer(
      question,
      isQuestionAnswerCorrect(question, selected),
    );
  }
  expect(readPlayerSave().data.pokedex).toEqual([]);
});

it('persists before round completion and includes discoveries in backup replacement', async () => {
  const first = questionFor('type-twins');
  await registerPokedexAnswer(first, true);
  expect(readPlayerSave().data.results.progress.correctPokemon).toEqual([]);
  const backup = parseBackup(JSON.stringify(await createBackup()));
  await registerPokedexAnswer(questionFor('evolution-link'), true);
  await restoreBackup(backup);
  expect(readPlayerSave().data.pokedex).toEqual(getQuestionPokemon(first));
});

it('rejects invalid collection data without mutating the input', () => {
  const save = {
    version: 7,
    restoreId: null,
    data: { ...emptyPlayerData(), pokedex: ['pikachu', 42] },
  };
  const raw = JSON.stringify(save);
  expect(() => parsePlayerSave(save)).toThrow();
  expect(JSON.stringify(save)).toBe(raw);
});
it('opens Pokédex through the same Trainer routing as the other achievements', () => {
  expect(parseTrainerRoute('?trainer=pokedex')).toBe('pokedex');
  expect(
    setTrainerRoute(new URL('https://example.com/'), 'pokedex').search,
  ).toBe('?trainer=pokedex');
});
