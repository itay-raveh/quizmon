import { getFormGroup } from './forms';
import type { Candidate } from './questions/context';
import { coreQuestionTypes, questionTypes } from './questions/definitions';
import {
  answerFlows,
  formGroups,
  generations,
  timerDisplays,
  trainingModes,
  type ExperienceSettings,
  type Modifiers,
  type PokemonCatalog,
} from './types';
import { isChoice, isObject } from './validation';

export const defaultModifiers: Modifiers = {
  answerFlow: 'manual',
  formGroups: [...formGroups],
  generations: [...generations],
  questionTypes: [...questionTypes],
  reduceMotion: false,
  soundVolume: 1,
  timerDisplay: 'seconds',
  trainingMode: 'league',
};

export const getExperienceSettings = (
  settings: ExperienceSettings,
): ExperienceSettings => ({
  answerFlow: settings.answerFlow,
  reduceMotion: settings.reduceMotion,
  soundVolume: settings.soundVolume,
  timerDisplay: settings.timerDisplay,
});

export const getChallengeModifiers = (
  experience: ExperienceSettings,
): Modifiers => ({
  ...defaultModifiers,
  ...getExperienceSettings(experience),
  generations: [...generations],
});

export const TRAINING_QUESTION_COUNT = 10;

export const isLeagueTraining = (
  modifiers: Pick<Modifiers, 'trainingMode'>,
): boolean => modifiers.trainingMode === 'league';

export const getTrainingModifiers = (modifiers: Modifiers): Modifiers => ({
  ...modifiers,
  questionTypes: isLeagueTraining(modifiers)
    ? [...coreQuestionTypes]
    : [...modifiers.questionTypes],
});

export const normalizeModifiers = (candidate: unknown): Modifiers => {
  if (!isObject(candidate)) return defaultModifiers;
  const savedFormGroups = candidate.formGroups;
  const selectedFormGroups = Array.isArray(savedFormGroups)
    ? formGroups.filter((group) => savedFormGroups.includes(group))
    : [];
  const selectedGenerations = Array.isArray(candidate.generations)
    ? candidate.generations.filter((generation) =>
        isChoice(generation, generations),
      )
    : [];
  const selectedQuestionTypes = Array.isArray(candidate.questionTypes)
    ? candidate.questionTypes.filter((questionType) =>
        isChoice(questionType, questionTypes),
      )
    : [];
  return {
    answerFlow: isChoice(candidate.answerFlow, answerFlows)
      ? candidate.answerFlow
      : candidate.speedrunMode === true
        ? 'instant'
        : defaultModifiers.answerFlow,
    formGroups:
      selectedFormGroups.length > 0 ? selectedFormGroups : [...formGroups],
    generations:
      selectedGenerations.length > 0
        ? selectedGenerations
        : defaultModifiers.generations,
    questionTypes:
      selectedQuestionTypes.length > 0
        ? selectedQuestionTypes
        : defaultModifiers.questionTypes,
    reduceMotion: candidate.reduceMotion === true,
    soundVolume:
      typeof candidate.soundVolume === 'number' &&
      Number.isFinite(candidate.soundVolume)
        ? Math.min(1, Math.max(0, candidate.soundVolume))
        : candidate.soundEnabled === false
          ? 0
          : defaultModifiers.soundVolume,
    timerDisplay: isChoice(candidate.timerDisplay, timerDisplays)
      ? candidate.timerDisplay
      : defaultModifiers.timerDisplay,
    trainingMode: isChoice(candidate.trainingMode, trainingModes)
      ? candidate.trainingMode
      : defaultModifiers.trainingMode,
  };
};

export const filterPokemon = (
  catalog: PokemonCatalog,
  modifiers: Pick<Modifiers, 'generations'> &
    Partial<Pick<Modifiers, 'formGroups'>>,
): Candidate[] =>
  Object.entries(catalog.pokemon)
    .filter(
      ([name, pokemon]) =>
        modifiers.generations.includes(pokemon.generation) &&
        (modifiers.formGroups ?? formGroups).includes(getFormGroup(name)),
    )
    .map(([name, pokemon]) => ({ name, pokemon }));
