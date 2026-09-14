import type { QuestionData } from './types';
import { catalog } from '../../../tests/fixtures/catalog';
import { createSeededRandom } from '../../lib/random';
import { generations, formGroups } from '../pokemon/types';
import { defaultGameSettings, filterPokemon } from '../settings/game-settings';
import { questionVariants, getQuestionVariant } from './question-variants';
import { isQuestionData } from './question-lineup';
import { buildQuestionType } from './questions/registry';
import {
  buildDailyTrackQuestions,
  resolveTrainingSettings,
} from './question-generation';
import type { Difficulty } from './difficulty';

const pool = filterPokemon(catalog, {
  generations: [...generations],
  formGroups: [...formGroups],
});
const cases = Object.entries(questionVariants).flatMap(([type, variants]) =>
  Object.keys(variants)
    .filter((key) => key !== 'rendering')
    .map((level) => ({
      type: type as QuestionData['questionType'],
      level: Number(level) as Difficulty,
    })),
);
it.each(cases)(
  'builds the configured $type checkpoint at Level $level from shipped facts',
  ({ type, level }) => {
    const question = buildQuestionType(
      {
        catalog,
        pool,
        generations: [...generations],
        difficulty: level,
        random: createSeededRandom(`checkpoint:${type}:${level}`),
        used: new Set(),
      },
      type,
    );
    expect(question, `${type} Level ${level}`).toBeDefined();
    expect(isQuestionData(question)).toBe(true);
    if (!question) return;
    const rules = getQuestionVariant(type, level)!.variant;
    if (question.answer.interaction === 'single-choice') {
      expect(question.answer.correctOptions).toHaveLength(1);
      expect(question.options.length).toBeGreaterThan(1);
    }
    if (rules.fullList === 'types')
      expect(question.options).toHaveLength(
        Object.keys(catalog.typeRelations).length,
      );
    if (rules.fullList === 'regions')
      expect(question.options).toHaveLength(catalog.topics!.regions.length);
    expect(question.rendering).toEqual(rules.rendering);
    expect(
      question.repetition.primary.every((name) => !!catalog.pokemon[name]),
    ).toBe(true);
    expect(
      question.repetition.distractors.every((name) => !!catalog.pokemon[name]),
    ).toBe(true);
  },
);
it('uses every eligible family through the active Daily settings path', () => {
  const settings = resolveTrainingSettings(catalog, {
    ...defaultGameSettings,
    difficulty: 3,
    generations: [...generations],
    formGroups: [...formGroups],
    questionSelection: 'automatic',
  });
  expect([...settings.questionTypes].sort()).toEqual(
    Object.keys(questionVariants)
      .filter(
        (type) =>
          type !== 'champion' &&
          getQuestionVariant(type as QuestionData['questionType'], 3),
      )
      .sort(),
  );
  const first = buildDailyTrackQuestions(
    catalog,
    '2026-09-13',
    settings,
    'all',
  );
  expect(first).toEqual(
    buildDailyTrackQuestions(catalog, '2026-09-13', settings, 'all'),
  );
  expect(first).toHaveLength(5);
  expect(first.at(-1)?.questionType).toBe('champion');
  expect(first.every((question) => question.variantLevel! <= 3)).toBe(true);
});

it.each(generations)(
  'keeps every family inside the %s generation and base-form scope',
  (generation) => {
    const restrictedPool = filterPokemon(catalog, {
      generations: [generation],
      formGroups: [],
    });
    const allowed = new Set(restrictedPool.map(({ name }) => name));
    for (const type of Object.keys(
      questionVariants,
    ) as QuestionData['questionType'][]) {
      const question = buildQuestionType(
        {
          catalog,
          pool: restrictedPool,
          generations: [generation],
          difficulty: 5,
          random: createSeededRandom(`${generation}:${type}`),
          used: new Set(),
        },
        type,
      );
      if (!question) continue;
      expect(question.subject.generation).toBe(generation);
      for (const name of [
        ...question.repetition.primary,
        ...question.repetition.distractors,
      ])
        expect(allowed.has(name), `${generation}:${type}:${name}`).toBe(true);
      expect(question.variantLevel).toBe(getQuestionVariant(type, 5)!.level);
    }
  },
);
