import { getAvailableTrainingQuestionTypes } from '@/domain/quiz/question-generation';
import { getFormGroupGenerations } from '@/domain/pokemon/forms';
import type { PokemonCatalog } from '@/domain/pokemon/types';
import { formGroups } from '@/domain/pokemon/types';
import {
  defaultGameSettings,
  filterPokemon,
  getTrainingSettings,
} from '@/domain/settings/game-settings';
import type { GameSettings } from '@/domain/settings/types';

export const getTrainingSettingsValidation = (
  catalog: PokemonCatalog,
  settings: Pick<
    GameSettings,
    | 'level'
    | 'questionSelection'
    | 'trainingMode'
    | 'generations'
    | 'formGroups'
    | 'questionTypes'
  >,
) => {
  const formGroupGenerations = getFormGroupGenerations(catalog);
  const availableFormGroups = formGroups.filter((group) =>
    formGroupGenerations[group].some((generation) =>
      settings.generations.includes(generation),
    ),
  );
  const formGroupsAreValid = settings.formGroups.some((group) =>
    availableFormGroups.includes(group),
  );
  const generationsAreValid = settings.generations.length > 0;
  const training = { ...defaultGameSettings, ...settings };
  const availableQuestionTypes = getAvailableTrainingQuestionTypes(
    catalog,
    training,
  );
  const eligibleQuestionTypes = getTrainingSettings(
    training,
  ).questionTypes.filter((type) => availableQuestionTypes.includes(type));
  const questionTypesAreValid = Boolean(
    settings.level && eligibleQuestionTypes.length > 0,
  );
  const matchingCount = filterPokemon(catalog, settings).length;
  return {
    generationsAreValid,
    formGroupsAreValid,
    formGroupGenerations,
    availableFormGroups,
    availableQuestionTypes,
    isValid:
      generationsAreValid &&
      formGroupsAreValid &&
      questionTypesAreValid &&
      matchingCount > 0,
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
