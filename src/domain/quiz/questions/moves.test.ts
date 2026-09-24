import type { PokemonCatalog } from '../../pokemon/types.ts';
import { expect, test } from 'vitest';
import type { QuestionContext } from './context.ts';
import { buildQuestionType } from './registry.ts';

const move = (name: string, label: string, type: string) => ({
  name,
  label,
  generations: ['II'],
  reviewedDescription: 'A move description.',
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

test('Move types excludes names that reveal their type from Level 3', () => {
  const catalog = {
    contentVersion: 1,
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

  expect(buildQuestionType(context(2), 'move-types')?.subject.name).toBe(
    'fire-punch',
  );
  for (const difficulty of [3, 4, 5] as const)
    expect(
      buildQuestionType(context(difficulty), 'move-types')?.subject.name,
    ).toBe('pound');
});
