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

test('level five can offer four type-colored TM discs for a move', () => {
  const catalog = {
    contentVersion: 1,
    pokemon: {},
    typeRelations: { fire: {}, water: {}, grass: {}, electric: {} },
    topics: {
      items: [],
      moves: [
        {
          name: 'flamethrower',
          label: 'Flamethrower',
          generations: ['II'],
          type: 'fire',
          damageClass: 'special',
          contexts: [
            {
              game: 'silver',
              generation: 'II',
              type: 'fire',
              damageClass: 'special',
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
  expect(question?.subject).toMatchObject({
    kind: 'move',
    name: 'flamethrower',
    generation: 'II',
  });
  expect(question?.answer.correctOptions).toEqual(['fire']);
  expect(question?.options).toHaveLength(4);
  expect(question?.prompt).toMatchObject({
    supportingText: 'Pokémon Silver',
  });
  expect(question?.optionImages).toEqual({
    fire: '/sprites/items/tm-fire.png',
    water: '/sprites/items/tm-water.png',
    grass: '/sprites/items/tm-grass.png',
    electric: '/sprites/items/tm-electric.png',
  });
  expect(
    question?.options.every((option) => question.optionLabels?.[option]),
  ).toBe(true);
});
