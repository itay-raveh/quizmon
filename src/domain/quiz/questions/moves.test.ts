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
});

test('move choices use their type in the question’s game', () => {
  const entries = [
    { ...move('pound', 'Pound', 'normal'), damageClass: 'physical' },
    { ...move('ember', 'Ember', 'fire'), damageClass: 'special' },
    { ...move('water-gun', 'Water Gun', 'water'), damageClass: 'special' },
    { ...move('vine-whip', 'Vine Whip', 'grass'), damageClass: 'special' },
  ].map((entry) => ({
    ...entry,
    generations: ['IV'],
    contexts: [
      {
        game: 'diamond',
        generation: 'IV',
        type: entry.name === 'pound' ? 'fire' : entry.type,
        damageClass: entry.damageClass,
      },
    ],
  }));
  const catalog = {
    pokemon: {},
    typeRelations: { fire: {}, water: {}, normal: {}, grass: {} },
    topics: {
      moves: entries,
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
  expect(question?.options).toContain('pound');
  expect(question?.optionMoves?.pound).toMatchObject({
    type: 'fire',
    sprite: '/sprites/items/tm-fire.png',
  });
});
