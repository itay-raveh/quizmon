import type { QuestionData } from './types.ts';
import { catalog } from '../../../tests/fixtures/catalog.ts';
import { createSeededRandom } from '../../lib/random.ts';
import { generations, formGroups } from '../pokemon/types.ts';
import {
  defaultGameSettings,
  filterPokemon,
} from '../settings/game-settings.ts';
import { questionVariants } from './question-variants.ts';
import { isQuestionData } from './question-lineup.ts';
import { buildQuestionType } from './questions/registry.ts';
import { buildQuestions } from './question-generation.ts';
import type { Difficulty } from './difficulty.ts';

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
  'builds a valid $type question at Level $level from shipped facts',
  ({ type, level }) => {
    const random = createSeededRandom(`checkpoint:${type}:${level}`);
    const questions =
      type === 'champion'
        ? [
            buildQuestionType(
              {
                catalog,
                pool,
                generations: [...generations],
                difficulty: level,
                random,
                used: new Set(),
              },
              type,
            ),
          ]
        : buildQuestions(
            catalog,
            {
              ...defaultGameSettings,
              difficulty: level,
              questionSelection: 'custom',
              generations: [...generations],
              formGroups: [...formGroups],
              questionTypes: [type],
            },
            random,
          );
    expect(questions).toHaveLength(type === 'champion' ? 1 : 10);
    for (const question of questions) {
      expect.assert.isDefined(question);
      expect(isQuestionData(question)).toBe(true);
      expect(question.questionType).toBe(type);
      expect(question.variantLevel).toBe(level);
      if (question.answer.interaction === 'single-choice') {
        expect(question.answer.correctOptions).toHaveLength(1);
        expect(question.options.length).toBeGreaterThan(1);
        expect(question.options).toContain(question.answer.correctOptions[0]);
      }
      if (question.answer.interaction === 'search') {
        expect(question.searchOptions!.map(({ name }) => name)).toContain(
          question.answer.correctOptions[0],
        );
      }
    }
  },
);

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
    }
  },
);
