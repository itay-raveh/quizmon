import { filterPokemon, isLeagueTraining } from '@/game/game';
import type { Modifiers, PokemonCatalog } from '@/game/types';

export const getTrainingSettingsValidation = (
  catalog: PokemonCatalog,
  modifiers: Modifiers,
) => {
  const generationsAreValid = modifiers.generations.length > 0;
  const questionTypesAreValid =
    isLeagueTraining(modifiers) ||
    (modifiers.questionTypes.length > 0 &&
      !(
        modifiers.questionTypes.includes('generation-roundup') &&
        modifiers.generations.length < 2
      ));
  const matchingCount = filterPokemon(catalog, modifiers).length;
  return {
    generationsAreValid,
    isValid: generationsAreValid && questionTypesAreValid && matchingCount > 0,
    matchingCount,
    questionTypesAreValid,
  };
};

export type TrainingSettingsValidation = ReturnType<
  typeof getTrainingSettingsValidation
>;

export const toggleValue = <T>(
  values: readonly T[],
  value: T,
  checked: boolean,
): T[] =>
  checked ? [...values, value] : values.filter((current) => current !== value);
