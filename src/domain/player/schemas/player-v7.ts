import { isAnswerSubject } from '../../quiz/subject';
import {
  isChoice,
  isDailyDate,
  isFiniteNonnegative,
  isNonemptyChoiceArray,
  isRecord,
  isSafeNonnegativeInteger,
  isUtcTimestamp,
} from '../../../lib/validation';
import { formGroups, generations } from '../../pokemon/types';
import { isLeagueVictory, LEAGUE_QUESTION_COUNT } from '../../quiz/league';
import { isQuestionHistory } from '../../quiz/question-history';
import { isSavedQuestionLineup } from '../../quiz/question-lineup';
import { questionTypes } from '../../quiz/questions/definitions';
import { isRoundRules } from '../../quiz/round-rules';
import { isScoreMultipliers } from '../../quiz/score-multipliers';
import { getUnifiedScoreKey } from '../../quiz/scoring';
import { isDifficulty } from '../../quiz/difficulty';
import {
  getDailyResultKey,
  hasDailyResultOnDate,
  isDailyTrack,
  parseDailyResultKey,
} from '../../quiz/daily-track';
import {
  questionCategories,
  retiredQuestionCategories,
  retiredQuestionTypes,
  type GameResult,
} from '../../quiz/types';
import { normalizeGameSettings } from '../../settings/game-settings';
import { SaveError } from '../save-schema';
import type { PlayerData } from '../player-save';
import {
  answerFlows,
  timerDisplays,
  trainingModes,
  type GameSettings,
} from '../../settings/types';
import type { LeagueVictoryRecord } from '../hall-of-fame';
import { normalizeResults, type SavedResults } from '../results';
import {
  normalizeTrainerProfile,
  TRAINER_NAME_MAX_LENGTH,
} from '../trainer-profile';
const isName = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0 && value.length <= 200;
const isCounts = (value: unknown, keys: readonly string[]): boolean =>
  isRecord(value) &&
  Object.entries(value).every(
    ([key, count]) => keys.includes(key) && isSafeNonnegativeInteger(count),
  );
const savedQuestionTypes = [
  ...questionTypes,
  ...retiredQuestionTypes,
  'champion',
] as const;
const savedQuestionCategories = [
  ...questionCategories,
  ...retiredQuestionCategories,
];
export const isSavedResult = (value: unknown): value is GameResult => {
  if (
    !isRecord(value) ||
    (value.scoreMultipliers !== undefined &&
      !isScoreMultipliers(value.scoreMultipliers)) ||
    (value.rules !== undefined && !isRoundRules(value.rules)) ||
    (value.dailyTrack !== undefined && !isDailyTrack(value.dailyTrack)) ||
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
      (answer.unassistedSearch === undefined ||
        typeof answer.unassistedSearch === 'boolean') &&
      typeof answer.correct === 'boolean' &&
      (answer.subject === undefined || isAnswerSubject(answer.subject)) &&
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
  isSavedResult(value.result) &&
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
    Object.entries(daily).every(([key, result]) => {
      const parsed = parseDailyResultKey(key);
      return (
        parsed !== undefined &&
        isSavedResult(result) &&
        getDailyResultKey(parsed.date, result.dailyTrack) === key
      );
    }) &&
    Object.entries(training).every(
      ([key, result]) =>
        isSavedResult(result) && getUnifiedScoreKey(result) === key,
    ) &&
    typeof league.completed === 'boolean' &&
    (league.seed === null || isName(league.seed)) &&
    Array.isArray(streak.creditedDates) &&
    streak.creditedDates.every(
      (date: unknown) => isDailyDate(date) && hasDailyResultOnDate(daily, date),
    ) &&
    isSafeNonnegativeInteger(progress.championAnswersWithoutClues) &&
    isCounts(progress.correctCategories, savedQuestionCategories) &&
    isCounts(progress.correctGenerations, generations) &&
    isCounts(progress.correctQuestionTypes, savedQuestionTypes) &&
    Array.isArray(progress.correctPokemon) &&
    progress.correctPokemon.every(isName) &&
    isSafeNonnegativeInteger(progress.masteryRounds) &&
    typeof progress.quickAttackCompleted === 'boolean' &&
    isSafeNonnegativeInteger(progress.quickAttackRounds)
  );
};
const isSettings = (value: unknown): value is GameSettings =>
  isRecord(value) &&
  isDifficulty(value.difficulty) &&
  (value.questionSelection === 'automatic' ||
    value.questionSelection === 'custom') &&
  isChoice(value.answerFlow, answerFlows) &&
  isChoice(value.timerDisplay, timerDisplays) &&
  isChoice(value.trainingMode, trainingModes) &&
  typeof value.reduceMotion === 'boolean' &&
  isFiniteNonnegative(value.soundVolume) &&
  value.soundVolume <= 1 &&
  isNonemptyChoiceArray(value.formGroups, formGroups) &&
  isNonemptyChoiceArray(value.generations, generations) &&
  isNonemptyChoiceArray(value.questionTypes, questionTypes);

export const parsePlayerDataV7 = (value: unknown): PlayerData => {
  if (
    !isRecord(value) ||
    typeof value.generationPromptAnswered !== 'boolean' ||
    !Array.isArray(value.pokedex) ||
    !value.pokedex.every(isName) ||
    !Array.isArray(value.hallOfFame) ||
    !value.hallOfFame.every(isVictoryRecord) ||
    new Set(value.hallOfFame.map((record: LeagueVictoryRecord) => record.id))
      .size !== value.hallOfFame.length ||
    !isQuestionHistory(value.questionHistory) ||
    (value.leagueLineup !== null &&
      (!isSavedQuestionLineup(value.leagueLineup) ||
        (value.leagueLineup.questions.length !== LEAGUE_QUESTION_COUNT &&
          !(
            value.leagueLineup.contentVersion === 0 &&
            value.leagueLineup.questions.length === 0
          )))) ||
    !isResults(value.results) ||
    (value.settings !== null && !isSettings(value.settings))
  )
    throw new SaveError(
      'invalid',
      'This save contains invalid progress or settings.',
    );
  const profile =
    value.profile === null ? null : normalizeTrainerProfile(value.profile);
  if (value.profile !== null && !profile)
    throw new SaveError(
      'invalid',
      'This save contains an invalid Trainer profile.',
    );
  return {
    questionHistory: value.questionHistory,
    leagueLineup: value.leagueLineup,
    generationPromptAnswered: value.generationPromptAnswered,
    hallOfFame: value.hallOfFame,
    pokedex: [...new Set(value.pokedex)],
    profile,
    results: normalizeResults(value.results),
    settings:
      value.settings === null ? null : normalizeGameSettings(value.settings),
  };
};
