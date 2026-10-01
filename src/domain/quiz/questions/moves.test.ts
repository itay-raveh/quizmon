import type { PokemonCatalog } from '../../pokemon/types.ts';
import { expect, test } from 'vitest';
import type { QuestionContext } from './context.ts';
import { difficultyLevels } from '../difficulty.ts';
import { getQuestionVariant } from '../variants.ts';
import { buildQuestionType } from './registry.ts';

const move = (name: string, label: string, type: string) => ({
  name,
  label,
  generations: ['II'],
  descriptions: { II: 'A move description.' },
  type,
  damageClass: 'physical',
  contexts: [
    {
      game: 'silver',
      generation: 'II',
      type,
      damageClass: 'physical',
    },
  ],
});

test('Move types excludes names that reveal their type when the hint filter is enabled', () => {
  const relaxed = difficultyLevels.find(
    (level) =>
      getQuestionVariant('moveTypes', level)?.variant.excludeTypeHintNames ===
      false,
  )!;
  const strict = difficultyLevels.find(
    (level) =>
      getQuestionVariant('moveTypes', level)?.variant.excludeTypeHintNames ===
      true,
  )!;
  const catalog = {
    pokemon: {},
    typeRelations: { fire: {}, water: {}, normal: {}, grass: {} },
    topics: {
      moves: [
        move('fire-punch', 'Fire Punch', 'fire'),
        move('waterfall', 'Waterfall', 'water'),
        move('pound', 'Pound', 'normal'),
      ],
      games: { silver: { label: 'Silver', generation: 'II' } },
    },
  } as unknown as PokemonCatalog;
  const context = (
    difficulty: QuestionContext['difficulty'],
  ): QuestionContext => ({
    catalog,
    difficulty,
    generations: ['II'],
    pool: [],
    random: () => 0.999,
    used: new Set(),
  });

  expect(buildQuestionType(context(relaxed), 'moveTypes')?.subject.name).toBe(
    'fire-punch',
  );
  expect(buildQuestionType(context(strict), 'moveTypes')?.subject.name).toBe(
    'pound',
  );
});
