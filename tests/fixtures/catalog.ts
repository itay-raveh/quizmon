import catalogData from '@/domain/pokemon/data/pokemon.json';
import type { QuestionContext } from '@/domain/quiz/questions/context';
import { filterPokemon } from '@/domain/settings/game-settings';
import { createSeededRandom } from '@/lib/random';
import {
  generations,
  type Generation,
  type PokemonCatalog,
} from '../../src/domain/pokemon/types';

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
