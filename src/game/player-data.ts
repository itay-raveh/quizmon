import {
  emptyQuestionHistory,
  isQuestionHistory,
  type QuestionHistory,
} from './question-history';
import { isQuestionLineup, type QuestionLineup } from './question-lineup';
import type { LeagueVictoryRecord } from './hall-of-fame';
import { isLeagueVictory, LEAGUE_QUESTION_COUNT } from './league';
import { normalizeModifiers } from './modifiers';
import {
  normalizeTrainerProfile,
  TRAINER_NAME_MAX_LENGTH,
  type TrainerProfile,
} from './profile-data';
import { questionTypes } from './questions/definitions';
import {
  normalizeResults,
  STREAK_VERSION,
  TRAINER_PROGRESS_VERSION,
  type SavedResults,
} from './results-data';
import {
  generations,
  answerFlows,
  timerDisplays,
  trainingModes,
  questionCategories,
  legacyQuestionCategories,
  legacyQuestionTypes,
  type GameResult,
  type Modifiers,
} from './types';
import {
  isDailyDate,
  isChoice,
  isFiniteNonnegative,
  isSafeNonnegativeInteger,
  isNonemptyChoiceArray,
  isRecord,
  isUtcTimestamp,
} from './validation';

interface PlayerDataV1 {
  generationPromptAnswered: boolean;
  profile: TrainerProfile | null;
  results: SavedResults;
  settings: Modifiers | null;
}

export interface PlayerSaveV1 {
  data: PlayerDataV1;
  restoreId: string | null;
  version: 1;
}

export interface PlayerData extends PlayerDataV1 {
  questionHistory: QuestionHistory;
  leagueLineup: QuestionLineup | null;
  pokedex: string[];
  hallOfFame: LeagueVictoryRecord[];
}

export interface PlayerSave {
  data: PlayerData;
  restoreId: string | null;
  version: 4;
}

export const emptyPlayerData = (): PlayerData => ({
  questionHistory: emptyQuestionHistory(),
  leagueLineup: null,
  generationPromptAnswered: false,
  hallOfFame: [],
  pokedex: [],
  profile: null,
  results: normalizeResults(null),
  settings: null,
});

const isName = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0 && value.length <= 200;

const isCounts = (value: unknown, keys: readonly string[]): boolean =>
  isRecord(value) &&
  Object.entries(value).every(
    ([key, count]) => keys.includes(key) && isSafeNonnegativeInteger(count),
  );

const savedQuestionCategories = [
  ...questionCategories,
  ...legacyQuestionCategories,
] as const;
const savedQuestionTypes = [
  ...questionTypes,
  'champion',
  ...legacyQuestionTypes,
] as const;

const isResult = (value: unknown): value is GameResult => {
  if (
    !isRecord(value) ||
    !Array.isArray(value.answers) ||
    !isSafeNonnegativeInteger(value.contentVersion) ||
    (value.scoreVersion !== undefined &&
      !isSafeNonnegativeInteger(value.scoreVersion)) ||
    !isSafeNonnegativeInteger(value.correctCount) ||
    !isSafeNonnegativeInteger(value.questionCount) ||
    value.questionCount < 1 ||
    value.correctCount > value.questionCount ||
    value.answers.length > value.questionCount ||
    !isSafeNonnegativeInteger(value.score) ||
    !isFiniteNonnegative(value.elapsedSeconds) ||
    (value.elapsedMilliseconds !== undefined &&
      !isFiniteNonnegative(value.elapsedMilliseconds))
  )
    return false;
  return value.answers.every(
    (answer: unknown) =>
      isRecord(answer) &&
      isChoice(answer.category, savedQuestionCategories) &&
      (answer.cluesUsed === undefined ||
        isSafeNonnegativeInteger(answer.cluesUsed)) &&
      typeof answer.correct === 'boolean' &&
      (answer.generation === undefined ||
        isChoice(answer.generation, generations)) &&
      (answer.pokemonName === undefined || isName(answer.pokemonName)) &&
      isSafeNonnegativeInteger(answer.points) &&
      (answer.questionType === undefined ||
        isChoice(answer.questionType, savedQuestionTypes)) &&
      (answer.responseMilliseconds === undefined ||
        isFiniteNonnegative(answer.responseMilliseconds)) &&
      (answer.speedBonus === undefined ||
        isSafeNonnegativeInteger(answer.speedBonus)),
  );
};

const isVictoryRecord = (value: unknown): value is LeagueVictoryRecord =>
  isRecord(value) &&
  isName(value.id) &&
  isUtcTimestamp(value.completedAt) &&
  typeof value.trainerName === 'string' &&
  value.trainerName.length <= TRAINER_NAME_MAX_LENGTH &&
  Array.isArray(value.pokemon) &&
  value.pokemon.length > 0 &&
  value.pokemon.every(isName) &&
  new Set(value.pokemon).size === value.pokemon.length &&
  isResult(value.result) &&
  isLeagueVictory(value.result) &&
  value.result.answers.every((answer) => answer.correct);

const isResults = (value: unknown): value is SavedResults => {
  if (
    !isRecord(value) ||
    !isRecord(value.daily) ||
    !isRecord(value.training) ||
    !isRecord(value.progress) ||
    !isRecord(value.streak) ||
    !isRecord(value.league)
  )
    return false;
  const { daily, training, progress, streak, league } = value;
  return (
    Object.entries(daily).every(
      ([date, result]) => isDailyDate(date) && isResult(result),
    ) &&
    Object.entries(training).every(
      ([key, result]) => isChoice(key, trainingModes) && isResult(result),
    ) &&
    typeof league.completed === 'boolean' &&
    (league.seed === null || isName(league.seed)) &&
    streak.version === STREAK_VERSION &&
    Array.isArray(streak.creditedDates) &&
    streak.creditedDates.every(
      (date: unknown) => isDailyDate(date) && Object.hasOwn(daily, date),
    ) &&
    progress.version === TRAINER_PROGRESS_VERSION &&
    isSafeNonnegativeInteger(progress.championAnswersWithoutClues) &&
    isCounts(progress.correctCategories, questionCategories) &&
    isCounts(progress.correctGenerations, generations) &&
    isCounts(progress.correctQuestionTypes, questionTypes) &&
    Array.isArray(progress.correctPokemon) &&
    progress.correctPokemon.every(isName) &&
    isSafeNonnegativeInteger(progress.masteryRounds) &&
    typeof progress.quickAttackCompleted === 'boolean' &&
    (progress.quickAttackRounds === undefined ||
      isSafeNonnegativeInteger(progress.quickAttackRounds))
  );
};

const isSettings = (value: unknown): value is Modifiers =>
  isRecord(value) &&
  isChoice(value.answerFlow, answerFlows) &&
  isChoice(value.timerDisplay, timerDisplays) &&
  isChoice(value.trainingMode, trainingModes) &&
  typeof value.reduceMotion === 'boolean' &&
  isFiniteNonnegative(value.soundVolume) &&
  value.soundVolume <= 1 &&
  isNonemptyChoiceArray(value.generations, generations) &&
  isNonemptyChoiceArray(value.questionTypes, questionTypes);

const parsePlayerData = (
  value: unknown,
  version: 1 | 2 | 3 | 4,
): PlayerData => {
  if (
    !isRecord(value) ||
    typeof value.generationPromptAnswered !== 'boolean' ||
    (version >= 2 &&
      (!Array.isArray(value.pokedex) || !value.pokedex.every(isName))) ||
    (version >= 3 &&
      (!Array.isArray(value.hallOfFame) ||
        !value.hallOfFame.every(isVictoryRecord) ||
        new Set(
          value.hallOfFame.map((record: LeagueVictoryRecord) => record.id),
        ).size !== value.hallOfFame.length)) ||
    (version === 4 &&
      (!isQuestionHistory(value.questionHistory) ||
        (value.leagueLineup !== null &&
          (!isQuestionLineup(value.leagueLineup) ||
            (value.leagueLineup.questions.length !== LEAGUE_QUESTION_COUNT &&
              !(
                value.leagueLineup.contentVersion === 0 &&
                value.leagueLineup.questions.length === 0
              )))))) ||
    !isResults(value.results) ||
    (value.settings !== null && !isSettings(value.settings))
  ) {
    throw new Error(
      'This save contains invalid progress or settings. Choose another backup.',
    );
  }
  const profile =
    value.profile === null ? null : normalizeTrainerProfile(value.profile);
  if (value.profile !== null && !profile) {
    throw new Error(
      'This save contains an invalid Trainer profile. Choose another backup.',
    );
  }
  return {
    questionHistory:
      version === 4
        ? (value.questionHistory as QuestionHistory)
        : emptyQuestionHistory(),
    leagueLineup:
      version === 4
        ? (value.leagueLineup as QuestionLineup | null)
        : value.results.league.seed
          ? {
              seed: value.results.league.seed,
              contentVersion: 0,
              questions: [],
            }
          : null,
    generationPromptAnswered: value.generationPromptAnswered,
    hallOfFame: version >= 3 ? (value.hallOfFame as LeagueVictoryRecord[]) : [],
    pokedex: [
      ...new Set(
        version === 1
          ? [
              ...value.results.progress.correctPokemon,
              ...[
                ...Object.values(value.results.daily),
                ...Object.values(value.results.training),
              ]
                .flatMap((result) => result.answers)
                .flatMap((answer) =>
                  answer.correct && answer.pokemonName
                    ? [answer.pokemonName]
                    : [],
                ),
            ]
          : (value.pokedex as string[]),
      ),
    ],
    profile,
    results: normalizeResults(value.results),
    settings:
      value.settings === null ? null : normalizeModifiers(value.settings),
  };
};

export const parsePlayerSave = (value: unknown): PlayerSave => {
  if (
    !isRecord(value) ||
    (value.version !== 1 &&
      value.version !== 2 &&
      value.version !== 3 &&
      value.version !== 4)
  ) {
    throw new Error(
      'This save uses an unsupported version. Update Quizmon or choose another backup.',
    );
  }
  if (value.restoreId !== null && !isName(value.restoreId)) {
    throw new Error('This save is damaged. Choose another backup.');
  }
  return {
    data: parsePlayerData(value.data, value.version),
    restoreId: value.restoreId,
    version: 4,
  };
};
