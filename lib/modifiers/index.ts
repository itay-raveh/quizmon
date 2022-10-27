import type { PokemonsInitialData } from 'lib/initialData';
import type { FormCategory } from 'lib/types/FormCategory';
import type { GenRoman } from 'lib/types/GenRoman';

export interface Modifiers {
  generations: GenRoman[];
  formCategories: FormCategory[];
  isLimitActive: boolean;
  limit: number;
}

export const initialValues: Modifiers = {
  generations: ['I'],
  formCategories: ['default'],
  isLimitActive: true,
  limit: 10,
};

/**
 * Filter a `PokemonsInitialData` based on a given `Modifiers`
 *
 * @param modifiers The modifiers to filter with.
 * @param pokemonsInitialData The data to filter.
 * @returns Names of the pokemon to be turned into questions.
 */
export const filterPokemonsInitialData = (
  modifiers: Modifiers,
  pokemonsInitialData: PokemonsInitialData
): string[] =>
  Object.entries(pokemonsInitialData)
    .filter(
      ([, pokemonInitialData]) =>
        modifiers.generations.includes(pokemonInitialData.generation) &&
        modifiers.formCategories.includes(pokemonInitialData.formCategory)
    )
    .map(([name]) => name);
