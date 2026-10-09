import { expect, it } from 'vitest';
import { questionTypes } from './questions/definitions.ts';
import {
  getTrainingQuestionAvailability,
  orderTrainingQuestionTypes,
  resolveTrainingSettings,
} from './question-generation.ts';
import pokemonData from '../pokemon/data/pokemon.json' with { type: 'json' };
import type { PokemonCatalog } from '../pokemon/types.ts';
import { gameLevels } from './level.ts';
import { getQuestionVariant } from './variants.ts';
import { questionRules } from './question-rules/registry.ts';
import {
  defaultGameSettings,
  getTrainingSettings,
} from '../settings/game-settings.ts';
import { getQuestionScore } from './scoring.ts';
import type { GameSettings } from '../settings/types.ts';

const catalog = pokemonData as unknown as PokemonCatalog;

it('explains sparse level ranges and excludes the same unavailable family from play', () => {
  const type = 'spriteForPokemon';
  const row = questionRules[type];
  const original = row.levels;
  const variant = getQuestionVariant(type, 1)!.variant;
  Reflect.set(row, 'levels', { 2: variant, 3: null, 4: variant });
  try {
    const settings: GameSettings = {
      ...defaultGameSettings,
      level: 3 as const,
      questionSelection: 'custom' as const,
      questionTypes: [type],
    };
    expect(getTrainingQuestionAvailability(catalog, settings)[type]).toEqual({
      kind: 'levels',
      levels: [2, 4, 5],
    });
    expect(resolveTrainingSettings(catalog, settings).questionTypes).toEqual(
      [],
    );
    const available = { ...settings, level: 4 as const };
    expect(
      getTrainingQuestionAvailability(catalog, available)[type],
    ).toBeUndefined();
    expect(resolveTrainingSettings(catalog, available).questionTypes).toContain(
      type,
    );
  } finally {
    Reflect.set(row, 'levels', original);
  }
});

it('requires multiple selected generations for roundup and becomes playable when supplied', () => {
  const type = 'pokemonByGeneration';
  const level = gameLevels.find((level) => getQuestionVariant(type, level))!;
  const settings: GameSettings = {
    ...defaultGameSettings,
    level,
    questionSelection: 'custom' as const,
    questionTypes: [type],
  };
  expect(getTrainingQuestionAvailability(catalog, settings)[type]?.kind).toBe(
    'generations',
  );
  expect(resolveTrainingSettings(catalog, settings).questionTypes).toEqual([]);
  const available: GameSettings = { ...settings, generations: ['I', 'II'] };
  expect(
    getTrainingQuestionAvailability(catalog, available)[type],
  ).toBeUndefined();
  expect(resolveTrainingSettings(catalog, available).questionTypes).toContain(
    type,
  );
});

it('distinguishes a filtered-out pool from insufficient eligible content', () => {
  const type = 'spriteForPokemon';
  const settings: GameSettings = {
    ...defaultGameSettings,
    questionSelection: 'custom' as const,
    questionTypes: [type],
  };
  const empty = { ...catalog, pokemon: {} };
  expect(getTrainingQuestionAvailability(empty, settings)[type]?.kind).toBe(
    'no-pokemon',
  );
  const tooSmall = {
    ...catalog,
    pokemon: { pikachu: catalog.pokemon.pikachu! },
  };
  expect(getTrainingQuestionAvailability(tooSmall, settings)[type]?.kind).toBe(
    'content',
  );
  expect(resolveTrainingSettings(tooSmall, settings).questionTypes).toEqual([]);
  expect(
    getTrainingQuestionAvailability(catalog, settings)[type],
  ).toBeUndefined();
});

it("halves a previous Training format's draw weight without excluding it", () => {
  const [recent, fresh] = questionTypes;
  const types = [recent!, fresh!];
  const previous = new Set([recent!]);

  expect(orderTrainingQuestionTypes(types, previous, () => 0.2)).toEqual([
    recent,
    fresh,
  ]);
  expect(orderTrainingQuestionTypes(types, previous, () => 0.4)).toEqual([
    fresh,
    recent,
  ]);
});

it('keeps a retired family playable and scored in Custom but out of automatic Training', () => {
  const type = 'pokemonTypes';
  const row = questionRules[type];
  const hadActive = Object.hasOwn(row, 'active');
  const previous: unknown = Reflect.get(row, 'active');
  Reflect.set(row, 'active', false);
  try {
    const settings: GameSettings = {
      ...defaultGameSettings,
      level: 3 as const,
    };
    expect(getTrainingSettings(settings).questionTypes).not.toContain(type);
    expect(
      getTrainingSettings({
        ...settings,
        questionSelection: 'custom',
        questionTypes: [type],
      }).questionTypes,
    ).toEqual([type]);
    expect(
      getQuestionScore({ questionType: type, correct: true }, 3).score,
    ).toBeGreaterThan(0);
  } finally {
    if (hadActive) Reflect.set(row, 'active', previous);
    else Reflect.deleteProperty(row, 'active');
  }
});
