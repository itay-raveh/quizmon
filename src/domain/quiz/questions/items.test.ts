import type { PokemonCatalog } from '../../pokemon/types.ts';
import { expect, test } from 'vitest';
import { isQuestionData } from '../lineup.ts';
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
    'itemIdentification',
  );
  expect(question?.subject.name).toBe('potion');
  expect(question?.options).toHaveLength(4);
});

test('item identification searches item names from level four', () => {
  const catalog = {
    pokemon: {},
    typeRelations: {},
    topics: {
      items: [
        item('potion', 'medicine', 'potion'),
        { ...item('poke-ball', 'balls', 'poke-ball'), label: 'Poké Ball' },
        {
          ...item('la-poke-ball', 'balls', 'la-poke-ball'),
          label: 'Poké Ball',
        },
        item('black-glasses', 'type-enhancement', 'black-glasses'),
        item('red-scarf', 'scarves', 'red-scarf'),
        item('go-goggles', 'gameplay', 'go-goggles'),
      ],
    },
  } as unknown as PokemonCatalog;
  const question = buildQuestionType(
    {
      catalog,
      difficulty: 4,
      pool: [],
      random: () => 0,
      used: new Set(),
    },
    'itemIdentification',
  );
  expect(question?.answer.interaction).toBe('search');
  expect(question?.searchOptions).toContainEqual({
    name: 'potion',
    label: 'potion',
    sprite: '/sprites/items/potion.png',
  });
  expect(question?.searchOptions).toHaveLength(1);
  expect(isQuestionData(question)).toBe(true);
});

test('level five item identification still searches items', () => {
  const catalog = {
    pokemon: {},
    typeRelations: {},
    topics: {
      items: [item('potion', 'medicine', 'potion')],
      moves: [{ name: 'fire-move', contexts: [{ machine: 'tm01' }] }],
    },
  } as unknown as PokemonCatalog;
  const question = buildQuestionType(
    {
      catalog,
      difficulty: 5,
      pool: [],
      random: () => 0,
      used: new Set(),
    },
    'itemIdentification',
  );
  expect(question?.subject).toMatchObject({ kind: 'item', name: 'potion' });
  expect(question?.answer.correctOptions).toEqual(['potion']);
  expect(question?.answer.interaction).toBe('search');
  expect(isQuestionData(question)).toBe(true);
});
