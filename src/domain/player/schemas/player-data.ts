import { z } from 'zod';
import { answerSubjectSchema } from '../../quiz/subject.ts';
import {
  dailyDateSchema,
  utcTimestampSchema,
} from '../../../lib/validation.ts';
import { formGroups, generations } from '../../pokemon/types.ts';
import { isLeagueVictory } from '../../quiz/league.ts';
import { questionHistorySchema } from '../../quiz/history.ts';
import { questionTypes } from '../../quiz/questions/definitions.ts';
import { savedRoundRulesSchema } from '../../quiz/round-rules.ts';
import { levelSchema } from '../../quiz/level.ts';
import { questionCategories } from '../../quiz/types.ts';
import { SaveError } from '../save-schema.ts';
import type { PlayerData } from '../player-save.ts';
import {
  answerFlows,
  timerDisplays,
  trainingModes,
} from '../../settings/types.ts';
import {
  TRAINER_NAME_MAX_LENGTH,
  trainerProfileSchema,
} from '../trainer-profile.ts';

const name = z.string().min(1).max(200);
const nonnegativeInteger = z.int().min(0);
const finiteNonnegative = z.number().nonnegative();
const counts = (keys: readonly string[]) =>
  z.partialRecord(z.enum(keys), nonnegativeInteger);
const savedQuestionType = z.enum([...questionTypes, 'champion']);
const savedResult = z
  .object({
    rules: savedRoundRulesSchema.optional(),
    answers: z.array(
      z.object({
        category: z.enum(questionCategories),
        cluesUsed: nonnegativeInteger.optional(),
        unassistedSearch: z.boolean().optional(),
        correct: z.boolean(),
        subject: answerSubjectSchema.optional(),
        points: nonnegativeInteger,
        questionType: savedQuestionType.optional(),
        responseMilliseconds: finiteNonnegative.optional(),
        speedBonus: nonnegativeInteger.optional(),
      }),
    ),
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
const victoryRecord = z
  .object({
    id: name,
    completedAt: utcTimestampSchema,
    trainerName: z.string().max(TRAINER_NAME_MAX_LENGTH),
    pokemon: z
      .array(name)
      .min(1)
      .refine((values) => new Set(values).size === values.length),
    result: savedResult,
  })
  .refine(
    ({ result }) =>
      isLeagueVictory(result) &&
      result.answers.every((answer) => answer.correct),
  );
export const progressSchema = z.object({
  championAnswersWithoutClues: nonnegativeInteger,
  correctCategories: counts(questionCategories),
  correctGenerations: counts(generations),
  correctQuestionTypes: counts(questionTypes),
  correctPokemon: z.array(name).transform((names) => [...new Set(names)]),
  masteryRounds: nonnegativeInteger,
  quickAttackRounds: nonnegativeInteger,
});
const results = z
  .object({
    daily: z.record(z.string(), savedResult),
    training: z.object({ score: savedResult.optional() }),
    progress: progressSchema,
    streak: z.object({
      creditedDates: z
        .array(dailyDateSchema)
        .transform((dates) => [...new Set(dates)].sort()),
    }),
    league: z.object({ completed: z.boolean(), seed: name.nullable() }),
  })
  .refine(
    ({ daily, streak }) =>
      Object.keys(daily).every(
        (key) => dailyDateSchema.safeParse(key).success,
      ) && streak.creditedDates.every((date) => Object.hasOwn(daily, date)),
  );
export const savedSettingsSchema = z.object({
  level: levelSchema,
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
    .array(name)
    .min(1)
    .transform((selected) =>
      questionTypes.filter((value) => selected.includes(value)),
    ),
  automaticQuestionTypes: z
    .array(name)
    .transform((selected) =>
      questionTypes.filter((value) => selected.includes(value)),
    )
    .optional(),
});
const playerData = z.object({
  pokedex: z.array(name),
  hallOfFame: z
    .array(victoryRecord)
    .refine(
      (records) => new Set(records.map(({ id }) => id)).size === records.length,
    ),
  questionHistory: questionHistorySchema,
  results,
  settings: savedSettingsSchema.nullable(),
  profile: trainerProfileSchema.nullable(),
});

export const parsePlayerData = (value: unknown): PlayerData => {
  const parsed = playerData.safeParse(value);
  if (!parsed.success)
    throw new SaveError(
      'invalid',
      parsed.error.issues.some(({ path }) => path[0] === 'profile')
        ? 'This save contains an invalid Trainer profile.'
        : 'This save contains invalid progress or settings.',
    );
  const data = parsed.data;
  return {
    questionHistory: data.questionHistory,
    hallOfFame: data.hallOfFame,
    pokedex: [...new Set(data.pokedex)],
    profile: data.profile,
    results: data.results,
    settings: data.settings,
  };
};
