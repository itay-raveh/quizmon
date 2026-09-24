import { z } from 'zod';
import { SAVE_SCHEMA_VERSION } from '../player-save.ts';
import { answerObservationSchema } from '../../quiz/answer-observation.ts';
import type { ActiveGameSnapshot } from '../active-game.ts';
import { answerSubjectSchema } from '../../quiz/subject.ts';
import { formGroups, generations } from '../../pokemon/types.ts';
import { isQuestionData } from '../../quiz/question-lineup.ts';
import { questionTypes } from '../../quiz/questions/definitions.ts';
import {
  questionCategories,
  type GameMode,
  type QuestionData,
} from '../../quiz/types.ts';
import { scoreMultipliersSchema } from '../../quiz/score-multipliers.ts';
import { difficultySchema } from '../../quiz/difficulty.ts';
import { isDailyTrack } from '../../quiz/daily-track.ts';
import {
  answerFlows,
  timerDisplays,
  trainingModes,
} from '../../settings/types.ts';
import {
  dailyDateSchema,
  utcTimestampSchema,
  uuidSchema,
} from '../../../lib/validation.ts';

const nonnegativeInteger = z.int().min(0);
const finiteNonnegative = z.number().nonnegative();
const mode = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('training') }),
  z.object({ kind: z.literal('league') }),
  z.object({
    kind: z.literal('daily'),
    date: dailyDateSchema,
    track: z.custom(isDailyTrack).optional(),
  }),
]);
const answer = z.object({
  observation: answerObservationSchema.optional(),
  category: z.enum(questionCategories),
  cluesUsed: nonnegativeInteger,
  unassistedSearch: z.boolean().optional(),
  correct: z.boolean(),
  points: finiteNonnegative,
  questionType: z.enum([...questionTypes, 'champion']),
  responseMilliseconds: finiteNonnegative.optional(),
  speedBonus: finiteNonnegative.optional(),
  subject: answerSubjectSchema,
});
const settings = z.looseObject({
  generations: z.array(z.enum(generations)).min(1),
  questionTypes: z.array(z.enum(questionTypes)).min(1),
  trainingMode: z.enum(trainingModes),
  formGroups: z.array(z.enum(formGroups)).min(1),
  answerFlow: z.enum(answerFlows),
  timerDisplay: z.enum(timerDisplays),
  reduceMotion: z.boolean(),
  soundVolume: finiteNonnegative.max(1),
  difficulty: difficultySchema.optional(),
  questionSelection: z.enum(['custom', 'automatic']).optional(),
  automaticQuestionTypes: z.array(z.enum(questionTypes)).optional(),
});
const round = z
  .object({
    version: z.literal(SAVE_SCHEMA_VERSION),
    completedAt: utcTimestampSchema.optional(),
    startedOn: dailyDateSchema.optional(),
    scoreMultipliers: scoreMultipliersSchema.optional(),
    contentVersion: nonnegativeInteger,
    elapsedMilliseconds: finiteNonnegative,
    questionCount: nonnegativeInteger.min(1),
    seed: z.string().min(1).max(200),
    answers: z.array(answer),
    questions: z.array(z.custom<QuestionData>(isQuestionData)),
    roundId: uuidSchema,
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
    settings: snapshot.settings,
    playerRestoreId:
      typeof snapshot.playerRestoreId === 'string'
        ? snapshot.playerRestoreId
        : null,
  };
};
