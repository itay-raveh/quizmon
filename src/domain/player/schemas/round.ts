import { SAVE_SCHEMA_VERSION } from '../player-save.ts';
import { isAnswerObservation } from '../../quiz/answer-observation.ts';
import type { ActiveGameSnapshot } from '../active-game.ts';
import { isAnswerSubject } from '../../quiz/subject.ts';
import { formGroups, generations } from '../../pokemon/types.ts';
import { isQuestionData } from '../../quiz/question-lineup.ts';
import { questionTypes } from '../../quiz/questions/definitions.ts';
import {
  questionCategories,
  type AnswerResult,
  type GameMode,
} from '../../quiz/types.ts';
import { isScoreMultipliers } from '../../quiz/score-multipliers.ts';
import { isDifficulty } from '../../quiz/difficulty.ts';
import { isDailyTrack } from '../../quiz/daily-track.ts';
import {
  answerFlows,
  timerDisplays,
  trainingModes,
  type GameSettings,
} from '../../settings/types.ts';
import {
  isChoice,
  isDailyDate,
  isFiniteNonnegative,
  isNonemptyChoiceArray,
  isNonnegativeInteger,
  isRecord,
  isUtcTimestamp,
} from '../../../lib/validation.ts';
const parseMode = (value: unknown): GameMode | null => {
  if (!isRecord(value)) return null;
  if (value.kind === 'training') return { kind: 'training' };
  if (value.kind === 'league') return { kind: 'league' };
  if (value.kind === 'daily' && isDailyDate(value.date)) {
    if (value.track !== undefined && !isDailyTrack(value.track)) return null;
    return {
      kind: 'daily',
      date: value.date,
      ...(value.track === undefined ? {} : { track: value.track }),
    };
  }
  return null;
};
const parseAnswer = (value: unknown): AnswerResult | null => {
  if (
    !isRecord(value) ||
    (value.observation !== undefined &&
      !isAnswerObservation(value.observation)) ||
    !isChoice(value.category, questionCategories) ||
    !isNonnegativeInteger(value.cluesUsed) ||
    typeof value.correct !== 'boolean' ||
    !isAnswerSubject(value.subject) ||
    !isFiniteNonnegative(value.points) ||
    (value.questionType !== 'champion' &&
      !isChoice(value.questionType, questionTypes)) ||
    (value.responseMilliseconds !== undefined &&
      !isFiniteNonnegative(value.responseMilliseconds)) ||
    (value.speedBonus !== undefined && !isFiniteNonnegative(value.speedBonus))
  ) {
    return null;
  }
  return {
    ...(isAnswerObservation(value.observation)
      ? { observation: value.observation }
      : {}),
    category: value.category,
    cluesUsed: value.cluesUsed,
    ...(typeof value.unassistedSearch === 'boolean'
      ? { unassistedSearch: value.unassistedSearch }
      : {}),
    correct: value.correct,
    points: value.points,
    questionType: value.questionType,
    ...(value.responseMilliseconds === undefined
      ? {}
      : { responseMilliseconds: value.responseMilliseconds }),
    ...(value.speedBonus === undefined ? {} : { speedBonus: value.speedBonus }),
    subject: value.subject,
  };
};
const parseGameSettings = (value: unknown): GameSettings | null => {
  if (
    !isRecord(value) ||
    !isNonemptyChoiceArray(value.generations, generations) ||
    !isNonemptyChoiceArray(value.questionTypes, questionTypes) ||
    !isChoice(value.trainingMode, trainingModes) ||
    !isNonemptyChoiceArray(value.formGroups, formGroups) ||
    !isChoice(value.answerFlow, answerFlows) ||
    !isChoice(value.timerDisplay, timerDisplays) ||
    typeof value.reduceMotion !== 'boolean' ||
    !isFiniteNonnegative(value.soundVolume) ||
    value.soundVolume > 1 ||
    (value.difficulty !== undefined && !isDifficulty(value.difficulty)) ||
    (value.questionSelection !== undefined &&
      value.questionSelection !== 'custom' &&
      value.questionSelection !== 'automatic') ||
    (value.automaticQuestionTypes !== undefined &&
      (!Array.isArray(value.automaticQuestionTypes) ||
        !value.automaticQuestionTypes.every((type) =>
          isChoice(type, questionTypes),
        )))
  ) {
    return null;
  }
  return value as unknown as GameSettings;
};
export const parseRound = (value: unknown): ActiveGameSnapshot | null => {
  if (
    !isRecord(value) ||
    value.version !== SAVE_SCHEMA_VERSION ||
    (value.completedAt !== undefined && !isUtcTimestamp(value.completedAt)) ||
    (value.scoreMultipliers !== undefined &&
      !isScoreMultipliers(value.scoreMultipliers)) ||
    !isNonnegativeInteger(value.contentVersion) ||
    !isFiniteNonnegative(value.elapsedMilliseconds) ||
    !isNonnegativeInteger(value.questionCount) ||
    value.questionCount < 1 ||
    typeof value.seed !== 'string' ||
    value.seed.length === 0 ||
    value.seed.length > 200 ||
    !Array.isArray(value.answers) ||
    value.answers.length > value.questionCount ||
    !Array.isArray(value.questions) ||
    value.questions.length !== value.questionCount ||
    !value.questions.every(isQuestionData) ||
    (value.roundId !== undefined &&
      (typeof value.roundId !== 'string' ||
        value.roundId.length > 200 ||
        !value.roundId))
  ) {
    return null;
  }
  const mode = parseMode(value.mode);
  const settings = parseGameSettings(value.settings);
  const answers = value.answers.map(parseAnswer);
  if (!mode || !settings || !answers.every((answer) => answer !== null))
    return null;
  return {
    questions: value.questions,
    ...(value.completedAt === undefined
      ? {}
      : { completedAt: value.completedAt }),
    ...(value.scoreMultipliers === undefined
      ? {}
      : { scoreMultipliers: value.scoreMultipliers }),
    ...(value.roundId === undefined ? {} : { roundId: value.roundId }),
    answers,
    contentVersion: value.contentVersion,
    elapsedMilliseconds: value.elapsedMilliseconds,
    mode,
    settings,
    questionCount: value.questionCount,
    playerRestoreId:
      typeof value.playerRestoreId === 'string' ? value.playerRestoreId : null,
    seed: value.seed,
    version: value.version,
  };
};
