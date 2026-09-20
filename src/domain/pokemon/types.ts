import type { TopicCatalog } from '../quiz/topic-catalog.ts';
export const generations = [
  'I',
  'II',
  'III',
  'IV',
  'V',
  'VI',
  'VII',
  'VIII',
  'IX',
] as const;

export type Generation = (typeof generations)[number];

export const statNames = [
  'hp',
  'attack',
  'defense',
  'special-attack',
  'special-defense',
  'speed',
] as const;

export type StatName = (typeof statNames)[number];

interface PokemonIdentitySpriteGeneration {
  back: string[];
  front: string[];
  generation: Generation;
}

export interface PokemonIdentitySprites {
  generations: PokemonIdentitySpriteGeneration[];
}

export interface SpriteMeasurements {
  area: number;
  width: number;
  height: number;
  centerX: number;
  bottom: number;
  pixelPeekFocus?: string;
}

export type PixelPeekFocus = [x: number, y: number];

export type PackedSpriteMeasurements = [
  area: number,
  width: number,
  height: number,
  centerX: number,
  bottom: number,
];

export interface PokemonKnowledge {
  height?: number;
  weight?: number;
  isBaby?: boolean;
  isUnevolved?: boolean;
  eggGroups?: string[];
  abilitySlots?: { name: string; hidden: boolean; slot: number }[];
  evYield?: Record<StatName, number>;
  abilities: string[];
  color: string;
  description: string;
  displayName: string;
  hasDistinctDescription: boolean;
  evolutionFamily: number;
  evolvesFrom: string | null;
  evolvesTo: string[];
  generation: Generation;
  speciesGeneration: Generation;
  speciesId: number;
  speciesName: string;
  pokemonId: number;
  genus: string;
  formId: number;
  identitySprites: PokemonIdentitySprites;
  isLegendary: boolean;
  isMythical: boolean;
  levelMoves: string[];
  shape: string;
  shinySprite: string | null;
  sprite: string | null;
  spriteMeasurements: PackedSpriteMeasurements | null;
  pixelPeekFocus?: string;
  stats: Record<StatName, number>;
  types: string[];
}

interface TypeRelations {
  doubleTo: string[];
  halfTo: string[];
  noneTo: string[];
}

export interface PokemonCatalog {
  topics?: TopicCatalog;
  contentVersion: number;
  pokemon: Record<string, PokemonKnowledge>;
  typeRelations: Record<string, TypeRelations>;
}

export const formGroups = [
  'standard',
  'regional',
  'mega',
  'gigantamax',
] as const;
export type FormGroup = (typeof formGroups)[number];
