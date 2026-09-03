import { filterPokemon } from '@/game/game';
import type { Modifiers, PokemonCatalog } from '@/game/types';

export const roundLengths = [
  { label: 'Quick', value: 5 },
  { label: 'Standard', value: 10 },
  { label: 'Long', value: 20 },
] as const;

export const getRoundLength = (limit: number) =>
  roundLengths.some(({ value }) => value === limit) ? limit : 10;

export const getTrainingSettingsValidation = (
  catalog: PokemonCatalog,
  modifiers: Modifiers,
) => {
  const generationsAreValid = modifiers.generations.length > 0;
  const questionTypesAreValid = modifiers.questionTypes.length > 0;
  const matchingCount = filterPokemon(catalog, modifiers).length;
  return {
    generationsAreValid,
    isValid: generationsAreValid && questionTypesAreValid && matchingCount > 0,
    matchingCount,
    questionTypesAreValid,
  };
};
