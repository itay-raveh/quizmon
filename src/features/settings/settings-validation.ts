import { getTrainingScoreMultipliers } from '@/domain/quiz/score-multipliers';
import { resolveTrainingSettings } from '@/domain/quiz/question-generation';
import { getFormGroupGenerations } from '@/domain/pokemon/forms';
import type { PokemonCatalog } from '@/domain/pokemon/types';
import { formGroups } from '@/domain/pokemon/types';
import {
  defaultGameSettings,
  filterPokemon,
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
  const resolved = settings.level
    ? resolveTrainingSettings(catalog, { ...defaultGameSettings, ...settings })
    : null;
  const eligibleQuestionTypes =
    resolved?.questionTypes ?? settings.questionTypes;
  const availableQuestionTypes =
    resolved?.automaticQuestionTypes ?? settings.questionTypes;
  const questionTypesAreValid = Boolean(
    settings.level && eligibleQuestionTypes.length > 0,
  );
  const matchingCount = filterPokemon(catalog, settings).length;
  return {
    scoreMultipliers:
      matchingCount > 0 && formGroupsAreValid
        ? getTrainingScoreMultipliers({
            ...settings,
            questionTypes: eligibleQuestionTypes,
          })
        : undefined,
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
