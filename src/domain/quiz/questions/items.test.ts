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

test('level three item choices never consist only of berries', () => {
  const catalog = {
    pokemon: {},
    typeRelations: {},
    topics: {
      items: [
        ...['cheri', 'chesto', 'pecha', 'rawst'].map((name) => ({
          ...item(`${name}-berry`, 'berries', name),
          pocket: 'berries',
        })),
        ...['potion', 'antidote', 'ether', 'elixir'].map((name) =>
          item(name, 'medicine', name),
        ),
      ],
    },
  } as unknown as PokemonCatalog;
  const question = buildQuestionType(
    {
      catalog,
      level: 3,
      pool: [],
      random: () => 0.999,
      used: new Set(),
    },
    'itemIdentification',
  );
  expect(question).toBeDefined();
  expect(question!.options.some((option) => !option.endsWith('-berry'))).toBe(
    true,
  );
});

test('obvious equipment cannot be an item-identification answer or distractor', () => {
  const catalog = {
    pokemon: {},
    typeRelations: {},
    topics: {
      items: [
        ...['acro-bike', 'super-rod', 'roller-skates', 'air-balloon'].map(
          (name) => item(name, 'gameplay', name),
        ),
        ...['potion', 'poke-ball', 'escape-rope', 'repel'].map((name) =>
          item(name, 'gameplay', name),
        ),
      ],
    },
  } as unknown as PokemonCatalog;

  for (const level of [2, 3, 4] as const) {
    const question = buildQuestionType(
      {
        catalog,
        level,
        pool: [],
        random: () => 0.999,
        used: new Set(),
      },
      'itemIdentification',
    );
    expect(question?.subject.name).toBe('potion');
    const choices = [
      ...(question?.options ?? []),
      ...(question?.searchOptions?.map(({ name }) => name) ?? []),
    ];
    expect(choices).not.toContain('acro-bike');
    expect(choices).not.toContain('air-balloon');
    expect(choices).not.toContain('roller-skates');
  }
});

test('bags enter item identification at Level 3', () => {
  const catalog = {
    pokemon: {},
    typeRelations: {},
    topics: {
      items: [
        item('berry-pouch', 'gameplay', 'berry-pouch'),
        ...['seal-case', 'prop-case', 'tm-case', 'coin-case'].map((name) =>
          item(name, 'gameplay', name),
        ),
      ],
    },
  } as unknown as PokemonCatalog;
  const build = (level: 2 | 3) =>
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

  expect(build(2)?.options).not.toContain('berry-pouch');
  expect(build(3)?.subject.name).toBe('berry-pouch');
});
