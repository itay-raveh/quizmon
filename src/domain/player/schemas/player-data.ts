import { z } from 'zod';
import { isAnswerSubject } from '../../quiz/subject.ts';
import { isDailyDate, isUtcTimestamp } from '../../../lib/validation.ts';
import { formGroups, generations } from '../../pokemon/types.ts';
import { isLeagueVictory, LEAGUE_QUESTION_COUNT } from '../../quiz/league.ts';
import {
  isQuestionHistory,
  type QuestionHistory,
} from '../../quiz/question-history.ts';
import {
  isQuestionLineup,
  type QuestionLineup,
} from '../../quiz/question-lineup.ts';
import { questionTypes } from '../../quiz/questions/definitions.ts';
import { isRoundRules } from '../../quiz/round-rules.ts';
import { isScoreMultipliers } from '../../quiz/score-multipliers.ts';
import { getUnifiedScoreKey } from '../../quiz/scoring.ts';
import { isDifficulty, type Difficulty } from '../../quiz/difficulty.ts';
import {
  getDailyResultKey,
  hasDailyResultOnDate,
  isDailyTrack,
  parseDailyResultKey,
} from '../../quiz/daily-track.ts';
import { questionCategories, type GameResult } from '../../quiz/types.ts';
import { SaveError } from '../save-schema.ts';
import type { PlayerData } from '../player-save.ts';
import {
  answerFlows,
  timerDisplays,
  trainingModes,
} from '../../settings/types.ts';
import type { LeagueVictoryRecord } from '../hall-of-fame.ts';
import { normalizeResults, type SavedResults } from '../results.ts';
import {
  normalizeTrainerProfile,
  TRAINER_NAME_MAX_LENGTH,
} from '../trainer-profile.ts';

const name = z.string().min(1).max(200);
const nonnegativeInteger = z.int().min(0);
const finiteNonnegative = z.number().nonnegative();
const counts = (keys: readonly string[]) =>
  z.partialRecord(z.enum(keys), nonnegativeInteger);
const savedQuestionTypes = [...questionTypes, 'champion'] as const;
const savedResult = z
  .object({
    scoreMultipliers: z.custom(isScoreMultipliers).optional(),
    rules: z.custom(isRoundRules).optional(),
    dailyTrack: z.custom(isDailyTrack).optional(),
    puzzleId: z
      .string()
      .regex(/^[a-f0-9]{64}$/)
      .optional(),
    answers: z.array(
      z.object({
        category: z.enum(questionCategories),
        cluesUsed: nonnegativeInteger.optional(),
        unassistedSearch: z.boolean().optional(),
        correct: z.boolean(),
        subject: z.custom(isAnswerSubject).optional(),
        points: nonnegativeInteger,
        questionType: z.enum(savedQuestionTypes).optional(),
        responseMilliseconds: finiteNonnegative.optional(),
        speedBonus: nonnegativeInteger.optional(),
      }),
    ),
    contentVersion: nonnegativeInteger,
    scoreVersion: nonnegativeInteger.optional(),
    correctCount: nonnegativeInteger,
    questionCount: nonnegativeInteger.min(1),
    score: nonnegativeInteger,
    elapsedSeconds: finiteNonnegative,
    elapsedMilliseconds: finiteNonnegative.optional(),
  })
  .refine(
    ({ answers, correctCount, questionCount }) =>
      correctCount <= questionCount && answers.length <= questionCount,
  );
const isSavedResult = (value: unknown): value is GameResult =>
  savedResult.safeParse(value).success;
const victoryRecord = z
  .object({
    id: name,
    completedAt: z.custom<string>(isUtcTimestamp),
    trainerName: z.string().max(TRAINER_NAME_MAX_LENGTH),
    pokemon: z
      .array(name)
      .min(1)
      .refine((values) => new Set(values).size === values.length),
    result: z.custom<GameResult>(isSavedResult),
  })
  .refine(
    ({ result }) =>
      isLeagueVictory(result) &&
      result.answers.every((answer) => answer.correct),
  );
const isVictoryRecord = (value: unknown): value is LeagueVictoryRecord =>
  victoryRecord.safeParse(value).success;
const results = z
  .object({
    daily: z.record(z.string(), z.custom<GameResult>(isSavedResult)),
    training: z.record(z.string(), z.custom<GameResult>(isSavedResult)),
    progress: z.object({
      championAnswersWithoutClues: nonnegativeInteger,
      correctCategories: counts(questionCategories),
      correctGenerations: counts(generations),
      correctQuestionTypes: counts(savedQuestionTypes),
      correctPokemon: z.array(name),
      masteryRounds: nonnegativeInteger,
      quickAttackCompleted: z.boolean(),
      quickAttackRounds: nonnegativeInteger,
    }),
    streak: z.object({ creditedDates: z.array(z.custom<string>(isDailyDate)) }),
    league: z.object({ completed: z.boolean(), seed: name.nullable() }),
  })
  .refine(
    ({ daily, training, streak }) =>
      Object.entries(daily).every(([key, result]) => {
        const parsed = parseDailyResultKey(key);
        return (
          parsed !== undefined &&
          getDailyResultKey(parsed.date, result.dailyTrack) === key
        );
      }) &&
      Object.entries(training).every(
        ([key, result]) => getUnifiedScoreKey(result) === key,
      ) &&
      streak.creditedDates.every((date) => hasDailyResultOnDate(daily, date)),
  );
const isResults = (value: unknown): value is SavedResults =>
  results.safeParse(value).success;
const settings = z.object({
  difficulty: z.custom<Difficulty>(isDifficulty),
  questionSelection: z.enum(['automatic', 'custom']),
  answerFlow: z.enum(answerFlows),
  timerDisplay: z.enum(timerDisplays),
  trainingMode: z.enum(trainingModes),
  reduceMotion: z.boolean(),
  soundVolume: finiteNonnegative.max(1),
  formGroups: z
    .array(z.enum(formGroups))
    .min(1)
    .transform((selected) =>
      formGroups.filter((value) => selected.includes(value)),
    ),
  generations: z
    .array(z.enum(generations))
    .min(1)
    .transform((selected) =>
      generations.filter((value) => selected.includes(value)),
    ),
  questionTypes: z
    .array(z.enum(questionTypes))
    .min(1)
    .transform((selected) =>
      questionTypes.filter((value) => selected.includes(value)),
    ),
  automaticQuestionTypes: z
    .array(z.enum(questionTypes))
    .transform((selected) =>
      questionTypes.filter((value) => selected.includes(value)),
    )
    .optional(),
});
const playerData = z.object({
  generationPromptAnswered: z.boolean(),
  pokedex: z.array(name),
  hallOfFame: z
    .array(z.custom<LeagueVictoryRecord>(isVictoryRecord))
    .refine(
      (records) => new Set(records.map(({ id }) => id)).size === records.length,
    ),
  questionHistory: z.custom<QuestionHistory>(isQuestionHistory),
  leagueLineup: z
    .custom<QuestionLineup>(isQuestionLineup)
    .nullable()
    .refine(
      (lineup) =>
        lineup === null || lineup.questions.length === LEAGUE_QUESTION_COUNT,
    ),
  results: z.custom<SavedResults>(isResults),
  settings: settings.nullable(),
  profile: z.unknown(),
});

export const parsePlayerData = (value: unknown): PlayerData => {
  const parsed = playerData.safeParse(value);
  if (!parsed.success)
    throw new SaveError(
      'invalid',
      'This save contains invalid progress or settings.',
    );
  const data = parsed.data;
  const profile =
    data.profile === null ? null : normalizeTrainerProfile(data.profile);
  if (data.profile !== null && !profile)
    throw new SaveError(
      'invalid',
      'This save contains an invalid Trainer profile.',
    );
  return {
    questionHistory: data.questionHistory,
    leagueLineup: data.leagueLineup,
    generationPromptAnswered: data.generationPromptAnswered,
    hallOfFame: data.hallOfFame,
    pokedex: [...new Set(data.pokedex)],
    profile,
    results: normalizeResults(data.results),
    settings: data.settings,
  };
};
