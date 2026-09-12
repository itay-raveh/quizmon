import { getQuestionVariant } from '../quiz/question-variants';
import { isChoice, isObject } from '../../lib/validation';
import { getFormGroup } from '../pokemon/forms';
import { formGroups, generations, type PokemonCatalog } from '../pokemon/types';
import type { Candidate } from '../quiz/questions/context';
import { isDifficulty } from '../quiz/difficulty';
import {
  coreQuestionTypes,
  questionTypes,
} from '../quiz/questions/definitions';
import {
  answerFlows,
  timerDisplays,
  trainingModes,
  type ExperienceSettings,
  type GameSettings,
} from './types';

export const defaultGameSettings: GameSettings = {
  difficulty: 1,
  questionSelection: 'automatic',
  answerFlow: 'manual',
  formGroups: [...formGroups],
  generations: ['I'],
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

export const getChallengeSettings = (
  experience: ExperienceSettings,
): GameSettings => ({
  ...defaultGameSettings,
  difficulty: undefined,
  questionSelection: undefined,
  ...getExperienceSettings(experience),
  generations: [...generations],
});

export const TRAINING_QUESTION_COUNT = 10;

export const isLeagueTraining = (
  settings: Pick<GameSettings, 'trainingMode'>,
): boolean => settings.trainingMode === 'league';

export const getTrainingSettings = (settings: GameSettings): GameSettings => ({
  ...settings,
  questionTypes: settings.difficulty
    ? (settings.questionSelection === 'custom'
        ? settings.questionTypes
        : questionTypes
      ).filter(
        (type) =>
          getQuestionVariant(type, settings.difficulty!) &&
          (type !== 'generation-roundup' || settings.generations.length > 1),
      )
    : isLeagueTraining(settings)
      ? [...coreQuestionTypes]
      : [...settings.questionTypes],
});

export const normalizeGameSettings = (candidate: unknown): GameSettings => {
  if (!isObject(candidate)) return defaultGameSettings;
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
    ...(Array.isArray(candidate.automaticQuestionTypes)
      ? {
          automaticQuestionTypes: questionTypes.filter((type) =>
            (candidate.automaticQuestionTypes as unknown[]).includes(type),
          ),
        }
      : {}),
    difficulty: isDifficulty(candidate.difficulty) ? candidate.difficulty : 3,
    questionSelection:
      candidate.questionSelection === 'custom' ||
      (candidate.questionSelection === undefined &&
        candidate.trainingMode === 'custom')
        ? 'custom'
        : 'automatic',
    answerFlow: isChoice(candidate.answerFlow, answerFlows)
      ? candidate.answerFlow
      : candidate.speedrunMode === true
        ? 'instant'
        : defaultGameSettings.answerFlow,
    formGroups:
      selectedFormGroups.length > 0 ? selectedFormGroups : [...formGroups],
    generations:
      selectedGenerations.length > 0
        ? selectedGenerations
        : defaultGameSettings.generations,
    questionTypes:
      selectedQuestionTypes.length > 0
        ? selectedQuestionTypes
        : defaultGameSettings.questionTypes,
    reduceMotion: candidate.reduceMotion === true,
    soundVolume:
      typeof candidate.soundVolume === 'number' &&
      Number.isFinite(candidate.soundVolume)
        ? Math.min(1, Math.max(0, candidate.soundVolume))
        : candidate.soundEnabled === false
          ? 0
          : defaultGameSettings.soundVolume,
    timerDisplay: isChoice(candidate.timerDisplay, timerDisplays)
      ? candidate.timerDisplay
      : defaultGameSettings.timerDisplay,
    trainingMode: isChoice(candidate.trainingMode, trainingModes)
      ? candidate.trainingMode
      : defaultGameSettings.trainingMode,
  };
};

export const filterPokemon = (
  catalog: PokemonCatalog,
  settings: Pick<GameSettings, 'generations'> &
    Partial<Pick<GameSettings, 'formGroups'>>,
): Candidate[] =>
  Object.entries(catalog.pokemon)
    .filter(
      ([name, pokemon]) =>
        settings.generations.includes(pokemon.generation) &&
        (settings.formGroups ?? formGroups).includes(getFormGroup(name)),
    )
    .map(([name, pokemon]) => ({ name, pokemon }));
