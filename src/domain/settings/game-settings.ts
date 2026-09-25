import {
  supportsStandardQuestion,
  standardLeagueQuestionTypes,
} from '../quiz/questions/definitions.ts';
import { getQuestionVariant } from '../quiz/question-variants.ts';
import { getFormGroup } from '../pokemon/forms.ts';
import {
  formGroups,
  generations,
  type PokemonCatalog,
} from '../pokemon/types.ts';
import type { Candidate } from '../quiz/questions/context.ts';
import { activeQuestionTypes } from '../quiz/questions/definitions.ts';
import { type ExperienceSettings, type GameSettings } from './types.ts';

export const defaultGameSettings: GameSettings = {
  difficulty: 1,
  questionSelection: 'automatic',
  answerFlow: 'manual',
  formGroups: [...formGroups],
  generations: ['I'],
  questionTypes: [...activeQuestionTypes],
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
        : activeQuestionTypes
      ).filter(
        (type) =>
          getQuestionVariant(type, settings.difficulty!) &&
          (type !== 'generation-roundup' || settings.generations.length > 1),
      )
    : isLeagueTraining(settings)
      ? [...standardLeagueQuestionTypes]
      : settings.questionTypes.filter((type) => supportsStandardQuestion(type)),
});

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
