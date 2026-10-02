import type { PokemonCatalog } from '../../pokemon/types.ts';
import { expect, test } from 'vitest';
import { isQuestionData } from '../lineup.ts';
import { gameLevels } from '../level.ts';
import { getQuestionVariant } from '../variants.ts';
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
  const level = gameLevels.find((level) =>
    getQuestionVariant('itemIdentification', level),
  )!;
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
      level,
      generations: ['II'],
      pool: [],
      random: () => 0.999,
      used: new Set(),
    },
    'itemIdentification',
  );
  expect(question?.subject.name).toBe('potion');
});

test('item identification searches item names when using a search response', () => {
  const level = gameLevels.find(
    (level) =>
      getQuestionVariant('itemIdentification', level)?.variant.response.kind ===
      'search',
  )!;
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
      level,
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

test('berry sprites cannot produce four berry choices below level four', () => {
  const catalog = {
    pokemon: {},
    typeRelations: {},
    topics: {
      items: ['cheri', 'chesto', 'pecha', 'rawst'].map((name) => ({
        ...item(`${name}-berry`, 'berries', name),
        pocket: 'berries',
      })),
    },
  } as unknown as PokemonCatalog;
  const build = (level: (typeof gameLevels)[number]) =>
    buildQuestionType(
      {
        catalog,
        level,
        pool: [],
        random: () => 0.999,
        used: new Set(),
      },
      'itemIdentification',
    );
  expect(build(3)).toBeUndefined();
  expect(build(4)?.subject.name).toMatch(/-berry$/);
  expect(build(4)?.answer.interaction).toBe('search');
});
