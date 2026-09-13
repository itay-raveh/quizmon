import { describe, expect, it } from 'vitest';
import {
  catalog,
  createQuestionContext,
} from '../../../tests/fixtures/catalog';
import { createSeededRandom } from '../../lib/random';
import { generations } from '../pokemon/types';
import { defaultGameSettings } from '../settings/game-settings';
import { difficultyLevels } from './difficulty';
import {
  buildDailyTrackQuestions,
  buildQuestions,
  resolveTrainingSettings,
} from './question-generation';
import { isQuestionData } from './question-lineup';
import { getQuestionVariant } from './question-variants';
import { questionTypes } from './questions/definitions';
import { buildQuestionType } from './questions/registry';
import {
  pokemonOptions,
  createPokemonSimilarityScorer,
} from './questions/answers';
it.each(difficultyLevels)(
  'builds complete scoped Training and deterministic Daily at level %i',
  (difficulty) => {
    for (const scope of ['gen-i', 'all'] as const) {
      const settings = resolveTrainingSettings(catalog, {
        ...defaultGameSettings,
        difficulty,
        generations: scope === 'gen-i' ? ['I'] : [...generations],
      });
      const questions = buildQuestions(
        catalog,
        settings,
        createSeededRandom('round'),
      );
      expect(questions).toHaveLength(10);
      const daily = buildDailyTrackQuestions(
        catalog,
        '2026-09-12',
        settings,
        scope,
      );
      expect(daily).toHaveLength(5);
      expect(daily).toEqual(
        buildDailyTrackQuestions(catalog, '2026-09-12', settings, scope),
      );
      for (const question of [...questions, ...daily]) {
        expect(isQuestionData(question), question.id).toBe(true);
        expect(question.variantLevel).toBeLessThanOrEqual(difficulty);
        expect(settings.generations).toContain(question.subject.generation);
        for (const option of question.searchOptions ?? [])
          expect(settings.generations).toContain(
            catalog.pokemon[option.name]!.generation,
          );
      }
      const finale = daily.at(-1)!;
      const finaleRules = getQuestionVariant('champion', difficulty)!.variant
        .finale!;
      expect(finale.initialClues).toBe(finaleRules.penalty);
      expect(finale.answer.interaction).toBe(
        finaleRules.opening === 'search' ? 'search' : 'single-choice',
      );
      expect(finale.assistanceAllowed).toBe(finaleRules.assistance);
    }
  },
);
describe.each(questionTypes)('%s variants', (questionType) => {
  it.each(difficultyLevels)(
    'obeys the resolved rules at level %i',
    (difficulty) => {
      const resolved = getQuestionVariant(questionType, difficulty);
      const settings = {
        ...defaultGameSettings,
        difficulty,
        generations: [...generations],
        questionTypes: [questionType],
      };
      const questions = buildQuestions(
        catalog,
        settings,
        createSeededRandom(`${questionType}:${difficulty}`),
      );
      if (!resolved) {
        expect(questions).toHaveLength(0);
        return;
      }
      expect(questions).toHaveLength(10);
      for (const question of questions) {
        expect(question.questionType).toBe(questionType);
        expect(question.variantLevel).toBe(resolved.level);
        expect(isQuestionData(question)).toBe(true);
        if (resolved.variant.search) {
          expect(question.answer.interaction).toBe('search');
          expect(question.searchOptions!.map(({ name }) => name)).toContain(
            question.answer.correctOptions[0],
          );
        }
        if (resolved.variant.preferBackSprite) {
          const back = catalog.pokemon[
            question.subject.name
          ]!.identitySprites.generations.filter(({ generation }) =>
            ['I', 'II', 'III', 'IV', 'V'].includes(generation),
          ).flatMap(({ back }) => back);
          if (back.length) {
            expect(question.media.kind).toBe('sprite');
            if (question.media.kind === 'sprite')
              expect(back).toContain(question.media.src);
          }
        }
        if (resolved.variant.typeGrid)
          expect(question.options).toHaveLength(18);
        if (resolved.variant.singleType)
          expect(question.subject.types ?? []).toHaveLength(1);
        if (resolved.variant.statGap) {
          const winner =
            question.optionStats![question.answer.correctOptions[0]!]!;
          for (const option of question.options.filter(
            (option) => !question.answer.correctOptions.includes(option),
          )) {
            const gap = Math.abs(winner - question.optionStats![option]!);
            expect(gap).toBeGreaterThanOrEqual(resolved.variant.statGap[0]);
            expect(gap).toBeLessThanOrEqual(resolved.variant.statGap[1]);
          }
        }
      }
    },
  );
});

it('retains every family at Level 5, including inherited softball variants', () => {
  for (const type of questionTypes)
    expect(getQuestionVariant(type, 5), type).toBeDefined();
});

it.each(generations)(
  'can generate both expert comparisons within Gen %s',
  (generation) => {
    for (const type of ['height-comparison', 'weight-comparison'] as const) {
      const question = buildQuestionType(
        {
          ...createQuestionContext(`expert:${generation}:${type}`, [
            generation,
          ]),
          difficulty: 5,
        },
        type,
      );
      expect(question, type).toBeDefined();
      expect(question!.rendering).toEqual(
        getQuestionVariant(type, 5)!.variant.rendering,
      );
      expect(question!.subject.generation).toBe(generation);
    }
  },
);

it('uses the closest distinct species for expert visual alternatives', () => {
  const context = createQuestionContext('closest', ['I']);
  context.pool = context.pool
    .filter(({ name, pokemon }) => name === pokemon.speciesName)
    .slice(0, 20);
  const target = context.pool[0]!;
  const score = createPokemonSimilarityScorer(target.pokemon);
  const ranked = context.pool
    .slice(1)
    .map(({ pokemon }) => score(pokemon))
    .sort((a, b) => b - a);
  const options = pokemonOptions(
    { ...context, variant: { distractors: 'similar', distractorPoolSize: 3 } },
    { correct: target },
  );
  expect(options).toHaveLength(4);
  expect(
    new Set(options.map((name) => catalog.pokemon[name]!.speciesId)).size,
  ).toBe(4);
  for (const name of options.filter((name) => name !== target.name))
    expect(score(catalog.pokemon[name]!)).toBeGreaterThanOrEqual(ranked[2]!);
});
