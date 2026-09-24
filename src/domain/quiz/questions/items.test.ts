import type { PokemonCatalog } from '../../pokemon/types.ts';
import { expect, test } from 'vitest';
import type { QuestionContext } from './context.ts';
import { buildQuestionType } from './registry.ts';

const names = [
  'full-heal',
  'full-restore',
  'antidote',
  'burn-heal',
  'ice-heal',
  'awakening',
  'paralyze-heal',
];
const catalog = {
  contentVersion: 1,
  pokemon: {},
  topics: {
    items: names.map((name, id) => ({
      id,
      name,
      label: name,
      generations: ['I'],
      sprite: `/sprites/items/${name}.png`,
      category: name,
      pocket: 'medicine',
    })),
    medicines: names.map((name) => ({
      name,
      cures:
        name === 'full-heal' || name === 'full-restore'
          ? ['poison', 'burn', 'freeze', 'sleep', 'paralysis']
          : [
              {
                antidote: 'poison',
                'burn-heal': 'burn',
                'ice-heal': 'freeze',
                awakening: 'sleep',
                'paralyze-heal': 'paralysis',
              }[name],
            ],
      hp: 0,
    })),
  },
} as unknown as PokemonCatalog;

const context = (
  difficulty: QuestionContext['difficulty'],
): QuestionContext => ({
  catalog,
  difficulty,
  generations: ['I'],
  pool: [],
  random: () => 0.999,
  used: new Set(),
});

test('Medicine cabinet excludes universal cures from Level 2', () => {
  expect(buildQuestionType(context(1), 'medicine-cabinet')?.subject.name).toBe(
    'full-heal',
  );
  for (const difficulty of [2, 3, 4, 5] as const)
    expect(
      buildQuestionType(context(difficulty), 'medicine-cabinet')?.subject.name,
    ).toBe('antidote');
});
