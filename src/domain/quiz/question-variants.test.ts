import { describe, expect, it } from 'vitest';
import { catalog } from '../../../tests/fixtures/catalog';
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
        expect(settings.generations).toContain(question.generation);
        for (const option of question.searchOptions ?? [])
          expect(settings.generations).toContain(
            catalog.pokemon[option.name]!.generation,
          );
      }
      const finale = daily.at(-1)!;
      expect(finale.initialClues).toBe([2, 1, 2, 0, 0][difficulty - 1]);
      expect(finale.answer.interaction).toBe(
        difficulty < 3 ? 'single-choice' : 'search',
      );
      expect(finale.assistanceAllowed).toBe(
        difficulty === 3 || difficulty === 4,
      );
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
        if (resolved.variant.typeGrid)
          expect(question.options).toHaveLength(18);
        if (resolved.variant.singleType)
          expect(question.pokemonTypes).toHaveLength(1);
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
