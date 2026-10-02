import type { PokemonCatalog } from '../../pokemon/types.ts';
import { expect, test } from 'vitest';
import type { QuestionContext } from './context.ts';
import { gameLevels } from '../level.ts';
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
  const relaxed = gameLevels.find(
    (level) =>
      getQuestionVariant('moveTypes', level)?.variant.excludeTypeHintNames ===
      false,
  )!;
  const strict = gameLevels.find(
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
  const context = (level: QuestionContext['level']): QuestionContext => ({
    catalog,
    level,
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
  const question = buildQuestionType(context(strict), 'moveTypes');
  expect(question?.prompt).toMatchObject({
    move: {
      name: 'Pound',
      sprite: '/sprites/items/tm-normal.png',
    },
  });
});

test('move category choices carry matching disc art and reveal their class', () => {
  const catalog = {
    pokemon: {},
    typeRelations: { fire: {}, water: {}, normal: {}, grass: {} },
    topics: {
      moves: [
        move('pound', 'Pound', 'normal'),
        move('ember', 'Ember', 'fire'),
        move('water-gun', 'Water Gun', 'water'),
        move('vine-whip', 'Vine Whip', 'grass'),
      ].map((entry, index) => ({
        ...entry,
        generations: ['IV'],
        damageClass: index === 0 ? 'physical' : 'special',
        contexts: entry.contexts.map((context) => ({
          ...context,
          game: 'diamond',
          generation: 'IV',
          damageClass: index === 0 ? 'physical' : 'special',
        })),
      })),
      games: { diamond: { label: 'Diamond', generation: 'IV' } },
    },
  } as unknown as PokemonCatalog;
  const question = buildQuestionType(
    {
      catalog,
      level: 3,
      generations: ['IV'],
      pool: [],
      random: () => 0.999,
      used: new Set(),
    },
    'moveCategory',
  );
  expect(question).toBeDefined();
  for (const option of question!.options) {
    const move = catalog.topics!.moves.find((entry) => entry.name === option)!;
    expect(question!.optionImages?.[option]).toBe(
      `/sprites/items/tm-${move.type}.png`,
    );
    expect(question!.optionReveals?.[option]).toContain(
      move.damageClass === 'physical' ? 'Physical' : 'Special',
    );
  }
});
