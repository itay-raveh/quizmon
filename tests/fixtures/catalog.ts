import catalogData from '@/game/data/pokemon.json';
import { filterPokemon } from '@/game/modifiers';
import type { QuestionContext } from '@/game/questions/context';
import { createSeededRandom } from '@/game/random';
import {
  generations,
  type Generation,
  type PokemonCatalog,
} from '@/game/types';

export const catalog = catalogData as unknown as PokemonCatalog;

export const createQuestionContext = (
  seed: string,
  selected: readonly Generation[] = generations,
): QuestionContext => ({
  catalog,
  pool: filterPokemon(catalog, { generations: [...selected] }),
  random: createSeededRandom(seed),
  used: new Set<string>(),
});
