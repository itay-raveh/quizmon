import catalogData from '@/game/data/pokemon.json';
import { createSeededRandom } from '@/game/random';
import type { QuestionContext } from '@/game/questions/shared';
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
  pool: Object.entries(catalog.pokemon)
    .filter(([, pokemon]) => selected.includes(pokemon.generation))
    .map(([name, pokemon]) => ({ name, pokemon })),
  random: createSeededRandom(seed),
  used: new Set<string>(),
});
