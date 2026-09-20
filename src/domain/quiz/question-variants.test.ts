import { expect, it } from 'vitest';
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
        if (question.answer.interaction === 'single-choice')
          expect(question.options.length, question.id).toBeGreaterThan(1);
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

it.each([3, 4, 5] as const)(
  'requires an alternative region within the selected scope at level %i',
  (difficulty) => {
    expect(
      buildQuestionType(
        {
          ...createQuestionContext('single-region', ['I']),
          difficulty,
        },
        'name-that-region',
      ),
    ).toBeUndefined();
    const question = buildQuestionType(
      {
        ...createQuestionContext('two-regions', ['I', 'II']),
        difficulty,
      },
      'name-that-region',
    );
    expect(question?.options.toSorted()).toEqual(['johto', 'kanto']);
  },
);
