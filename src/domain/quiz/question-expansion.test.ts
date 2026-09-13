import { catalog } from '../../../tests/fixtures/catalog';
import { createSeededRandom } from '../../lib/random';
import { generations, formGroups } from '../pokemon/types';
import { defaultGameSettings, filterPokemon } from '../settings/game-settings';
import {
  expansionVariants,
  type ExpansionQuestionType,
} from './question-expansion-variants';
import { getQuestionVariant } from './question-variants';
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
const cases = Object.entries(expansionVariants).flatMap(([type, variants]) =>
  Object.keys(variants).map((level) => ({
    type: type as ExpansionQuestionType,
    level: Number(level) as Difficulty,
  })),
);
it.each(cases)(
  'builds the approved $type checkpoint at Level $level from shipped facts',
  ({ type, level }) => {
    const question = buildQuestionType(
      {
        catalog,
        pool,
        generations: [...generations],
        difficulty: level,
        random: createSeededRandom(`expansion:${type}:${level}`),
        used: new Set(),
      },
      type,
    );
    expect(question, `${type} Level ${level}`).toBeDefined();
    expect(isQuestionData(question)).toBe(true);
    if (!question) return;
    expect(question.answer.interaction).toBe('single-choice');
    expect(question.answer.correctOptions).toHaveLength(1);
    const rules = getQuestionVariant(type, level)!.variant;
    expect(question.options.length).toBe(
      rules.fullList === 'types'
        ? Object.keys(catalog.typeRelations).length
        : rules.fullList === 'regions'
          ? catalog.topics!.regions.length
          : 4,
    );
    expect(question.namesOnly).toBe(rules.namesOnly);
    expect(
      question.repetition.primary.every((name) => !!catalog.pokemon[name]),
    ).toBe(true);
    expect(
      question.repetition.distractors.every((name) => !!catalog.pokemon[name]),
    ).toBe(true);
  },
);
it('includes all thirteen additions through the active Daily settings path', () => {
  const settings = resolveTrainingSettings(catalog, {
    ...defaultGameSettings,
    difficulty: 3,
    generations: [...generations],
    formGroups: [...formGroups],
    questionSelection: 'automatic',
  });
  expect(
    settings.questionTypes.filter((type) =>
      Object.hasOwn(expansionVariants, type),
    ),
  ).toHaveLength(13);
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
  'keeps every new family inside the %s generation and base-form scope',
  (generation) => {
    const restrictedPool = filterPokemon(catalog, {
      generations: [generation],
      formGroups: [],
    });
    const allowed = new Set(restrictedPool.map(({ name }) => name));
    for (const type of Object.keys(
      expansionVariants,
    ) as ExpansionQuestionType[]) {
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
