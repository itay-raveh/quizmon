import { z } from 'zod';
import {
  generations,
  statNames,
  type PokemonCatalog,
} from '../src/domain/pokemon/types.ts';

const text = z.string();
const texts = z.array(text);
const generation = z.enum(generations);
const entity = z.object({
  name: text,
  label: text,
  generations: z.array(generation),
});
const description = z.object({
  generation,
  text,
  explanation: text,
});
const topics = z.object({
  items: z.array(
    entity.extend({
      sprite: text.nullable(),
      spriteIdentity: text.optional(),
      category: text,
      pocket: text,
      effectKind: z.enum(['bag', 'held']).optional(),
      descriptions: z.array(description).optional(),
    }),
  ),
  moves: z.array(
    entity.extend({
      descriptions: z.partialRecord(generation, text).optional(),
      contexts: z.array(
        z.object({
          game: text,
          generation,
          type: text,
          damageClass: text,
          machine: text.optional(),
        }),
      ),
      type: text,
      damageClass: text,
    }),
  ),
  abilities: z.array(
    entity.extend({
      descriptions: z.array(description).optional(),
    }),
  ),
  natures: z.array(
    entity.extend({
      raised: z.enum(statNames),
      lowered: z.enum(statNames),
    }),
  ),
  berries: z.array(
    entity.extend({
      item: text,
      flavors: z.record(text, z.number()),
      giftType: text,
    }),
  ),
  regions: z.array(entity),
  locations: z.array(entity.extend({ region: text })),
  games: z.record(text, z.object({ label: text, generation })),
  evolutions: z.array(
    z.object({
      before: text,
      after: text,
      game: text,
      generation,
      trigger: text,
      item: text.optional(),
      conditions: texts,
    }),
  ),
  encounters: z.array(
    z.object({
      complete: z.boolean(),
      game: text,
      generation,
      region: text,
      area: text,
      label: text,
      method: text,
      conditions: texts,
      pokemon: texts,
    }),
  ),
});
const pokemon = z.object({
  height: z.number().optional(),
  weight: z.number().optional(),
  abilitySlots: z
    .array(z.object({ name: text, hidden: z.boolean(), slot: z.number() }))
    .optional(),
  evYield: z.record(z.enum(statNames), z.number()).optional(),
  abilities: texts,
  color: text,
  description: text,
  displayName: text,
  hasDistinctDescription: z.boolean(),
  evolutionFamily: z.number(),
  evolvesFrom: text.nullable(),
  evolvesTo: texts,
  generation,
  speciesId: z.number(),
  speciesName: text,
  pokemonId: z.number(),
  genus: text,
  formId: z.number(),
  identitySprites: z.object({
    generations: z.array(
      z.object({
        back: texts,
        front: texts,
        generation,
      }),
    ),
  }),
  isLegendary: z.boolean(),
  isMythical: z.boolean(),
  levelMoves: texts,
  shape: text,
  shinySprite: text.nullable(),
  sprite: text.nullable(),
  spriteMeasurements: z
    .tuple([z.number(), z.number(), z.number(), z.number(), z.number()])
    .nullable(),
  pixelPeekFocus: text.optional(),
  stats: z.record(z.enum(statNames), z.number()),
  types: texts,
});

export const catalogSchema: z.ZodType<PokemonCatalog> = z.object({
  contentVersion: z.int().nonnegative(),
  pokemon: z.record(text, pokemon),
  typeRelations: z.record(
    text,
    z.object({
      doubleTo: texts,
      halfTo: texts,
      noneTo: texts,
    }),
  ),
  topics: topics.optional(),
});
