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

export const formCategories = [
  'default',
  'mega',
  'gmax',
  'hisui',
  'galar',
  'alola',
  'other',
] as const;

export type FormCategory = (typeof formCategories)[number];

export interface PokemonSummary {
  formCategory: FormCategory;
  generation: Generation;
}

export type PokemonCatalog = Record<string, PokemonSummary>;

export interface Modifiers {
  generations: Generation[];
  formCategories: FormCategory[];
  randomSprite: boolean;
  soundEnabled: boolean;
  whosThatPokemon: boolean;
  isLimitActive: boolean;
  limit: number;
  speedrunMode: boolean;
}

export interface QuestionData {
  options: string[];
  pokemonName: string;
  spriteRandom: number;
}
