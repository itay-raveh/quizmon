import type { PokemonCatalog } from '../../pokemon/types.ts';
import { expect, test } from 'vitest';
import { buildQuestionType } from './registry.ts';

const item = (name: string, category: string, spriteIdentity: string) => ({
  name,
  label: name,
  category,
  pocket: 'items',
  generations: ['II'],
  sprite: `/sprites/items/${name}.png`,
  spriteIdentity,
});

test('item identification never asks for an item with shared sprite art', () => {
  const catalog = {
    contentVersion: 1,
    pokemon: {},
    typeRelations: {},
    topics: {
      items: [
        item('tm01', 'machines', 'shared-disc'),
        { ...item('tm02', 'machines', 'shared-disc'), generations: ['III'] },
        item('potion', 'medicine', 'potion'),
        item('poke-ball', 'balls', 'poke-ball'),
        item('escape-rope', 'travel', 'escape-rope'),
        item('repel', 'repels', 'repel'),
      ],
    },
  } as unknown as PokemonCatalog;
  const question = buildQuestionType(
    {
      catalog,
      difficulty: 1,
      generations: ['II'],
      pool: [],
      random: () => 0.999,
      used: new Set(),
    },
    'item-identification',
  );
  expect(question?.subject.name).toBe('potion');
  expect(question?.options).toHaveLength(4);
});

test('level five offers real TM labels without revealing disc types', () => {
  const catalog = {
    contentVersion: 1,
    pokemon: {},
    typeRelations: { fire: {}, water: {}, grass: {}, electric: {} },
    topics: {
      items: [],
      moves: [
        ...[
          ['fire-move', 'fire', 'tm01'],
          ['water-move', 'water', 'tm02'],
          ['grass-move', 'grass', 'tm03'],
          ['electric-move', 'electric', 'tm04'],
        ].map(([name, type, machine]) => ({
          name,
          label: name,
          generations: ['I'],
          type,
          damageClass: 'special',
          contexts: [
            {
              game: 'silver',
              generation: 'II',
              type,
              damageClass: 'special',
              machine,
            },
          ],
        })),
        {
          name: 'court-change',
          label: 'Court Change',
          generations: ['II'],
          type: 'normal',
          damageClass: 'status',
          contexts: [
            {
              game: 'silver',
              generation: 'II',
              type: 'normal',
              damageClass: 'status',
            },
          ],
        },
      ],
      games: { silver: { label: 'Silver', generation: 'II' } },
    },
  } as unknown as PokemonCatalog;
  const question = buildQuestionType(
    {
      catalog,
      difficulty: 5,
      generations: ['II'],
      pool: [],
      random: () => 0,
      used: new Set(),
    },
    'item-identification',
  );
  expect(question?.subject.kind).toBe('move');
  expect(question?.subject.name).not.toBe('court-change');
  const tmByMove: Record<string, string> = {
    'fire-move': 'tm01',
    'water-move': 'tm02',
    'grass-move': 'tm03',
    'electric-move': 'tm04',
  };
  expect(question?.answer.correctOptions).toEqual([
    tmByMove[question!.subject.name],
  ]);
  expect(question?.options).toHaveLength(4);
  expect(question?.prompt).toMatchObject({
    supportingText: 'Pokémon Silver',
  });
  expect(question?.optionImages).toEqual({
    tm01: '/sprites/items/tm-fire.png',
    tm02: '/sprites/items/tm-water.png',
    tm03: '/sprites/items/tm-grass.png',
    tm04: '/sprites/items/tm-electric.png',
  });
  expect(
    question?.options.every((option) =>
      /^TM \d+$/.test(question.optionLabels?.[option] ?? ''),
    ),
  ).toBe(true);
});
