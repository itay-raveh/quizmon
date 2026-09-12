import { resolveTrainingSettings } from '@/domain/quiz/question-generation';
import { getFormGroupGenerations } from '@/domain/pokemon/forms';
import type { PokemonCatalog } from '@/domain/pokemon/types';
import { formGroups } from '@/domain/pokemon/types';
import {
  defaultGameSettings,
  filterPokemon,
  isLeagueTraining,
} from '@/domain/settings/game-settings';
import type { GameSettings } from '@/domain/settings/types';

export const getTrainingSettingsValidation = (
  catalog: PokemonCatalog,
  settings: Pick<
    GameSettings,
    | 'difficulty'
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
  const eligibleQuestionTypes = settings.difficulty
    ? resolveTrainingSettings(catalog, { ...defaultGameSettings, ...settings })
        .questionTypes
    : settings.questionTypes;
  const questionTypesAreValid = settings.difficulty
    ? eligibleQuestionTypes.length > 0
    : isLeagueTraining(settings) ||
      (settings.questionTypes.length > 0 &&
        !(
          settings.questionTypes.includes('generation-roundup') &&
          settings.generations.length < 2
        ));
  const matchingCount = filterPokemon(catalog, settings).length;
  return {
    generationsAreValid,
    formGroupsAreValid,
    formGroupGenerations,
    availableFormGroups,
    isValid:
      generationsAreValid &&
      formGroupsAreValid &&
      questionTypesAreValid &&
      matchingCount > 0,
    unavailableSelectedCount:
      settings.questionSelection === 'custom'
        ? settings.questionTypes.filter(
            (type) => !eligibleQuestionTypes.includes(type),
          ).length
        : 0,
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
