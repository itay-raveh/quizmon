import { z } from 'zod';
import { SAVE_SCHEMA_VERSION } from '../player-save.ts';
import { isAnswerObservation } from '../../quiz/answer-observation.ts';
import type { ActiveGameSnapshot } from '../active-game.ts';
import { isAnswerSubject } from '../../quiz/subject.ts';
import { formGroups, generations } from '../../pokemon/types.ts';
import { isQuestionData } from '../../quiz/question-lineup.ts';
import { questionTypes } from '../../quiz/questions/definitions.ts';
import {
  questionCategories,
  type AnswerObservation,
  type AnswerSubject,
  type GameMode,
  type QuestionData,
  type ScoreMultipliers,
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
import { isDailyDate, isUtcTimestamp } from '../../../lib/validation.ts';

const nonnegativeInteger = z.int().min(0);
const finiteNonnegative = z.number().nonnegative();
const mode = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('training') }),
  z.object({ kind: z.literal('league') }),
  z.object({
    kind: z.literal('daily'),
    date: z.custom<string>(isDailyDate),
    track: z.custom(isDailyTrack).optional(),
  }),
]);
const answer = z
  .object({
    observation: z.custom<AnswerObservation>(isAnswerObservation).optional(),
    category: z.enum(questionCategories),
    cluesUsed: nonnegativeInteger,
    unassistedSearch: z.unknown().optional(),
    correct: z.boolean(),
    points: finiteNonnegative,
    questionType: z.enum([...questionTypes, 'champion']),
    responseMilliseconds: finiteNonnegative.optional(),
    speedBonus: finiteNonnegative.optional(),
    subject: z.custom<AnswerSubject>(isAnswerSubject),
  })
  .transform(({ unassistedSearch, ...entry }) => ({
    ...entry,
    ...(typeof unassistedSearch === 'boolean' ? { unassistedSearch } : {}),
  }));
const settings = z.looseObject({
  generations: z.array(z.enum(generations)).min(1),
  questionTypes: z.array(z.enum(questionTypes)).min(1),
  trainingMode: z.enum(trainingModes),
  formGroups: z.array(z.enum(formGroups)).min(1),
  answerFlow: z.enum(answerFlows),
  timerDisplay: z.enum(timerDisplays),
  reduceMotion: z.boolean(),
  soundVolume: finiteNonnegative.max(1),
  difficulty: z.custom(isDifficulty).optional(),
  questionSelection: z.enum(['custom', 'automatic']).optional(),
  automaticQuestionTypes: z.array(z.enum(questionTypes)).optional(),
});
const round = z
  .object({
    version: z.literal(SAVE_SCHEMA_VERSION),
    completedAt: z.custom<string>(isUtcTimestamp).optional(),
    startedOn: z.custom<string>(isDailyDate).optional(),
    scoreMultipliers: z.custom<ScoreMultipliers>(isScoreMultipliers).optional(),
    contentVersion: nonnegativeInteger,
    elapsedMilliseconds: finiteNonnegative,
    questionCount: nonnegativeInteger.min(1),
    seed: z.string().min(1).max(200),
    answers: z.array(answer),
    questions: z.array(z.custom<QuestionData>(isQuestionData)),
    roundId: z.string().min(1).max(200).optional(),
    mode,
    settings,
    playerRestoreId: z.unknown().optional(),
  })
  .refine(
    ({ answers, questions, questionCount }) =>
      answers.length <= questionCount && questions.length === questionCount,
  );

export const parseRound = (value: unknown): ActiveGameSnapshot | null => {
  const parsed = round.safeParse(value);
  if (!parsed.success) return null;
  const snapshot = parsed.data;
  return {
    ...snapshot,
    mode: snapshot.mode as GameMode,
    settings: snapshot.settings as GameSettings,
    playerRestoreId:
      typeof snapshot.playerRestoreId === 'string'
        ? snapshot.playerRestoreId
        : null,
  };
};
