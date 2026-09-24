import {
  answerObservationSchema,
  observationCorrect,
} from '../quiz/answer-observation.ts';
import { getTrainingScoreMultipliers } from '../quiz/score-multipliers.ts';
import { isLeagueVictory } from '../quiz/league.ts';
import { answerSubjectSchema } from '../quiz/subject.ts';
import { difficultySchema } from '../quiz/difficulty.ts';
import { isDailyTrack, type DailyTrack } from '../quiz/daily-track.ts';
import { questionTypes } from '../quiz/questions/definitions.ts';
import { questionCategories } from '../quiz/types.ts';
import { formGroups, generations } from '../pokemon/types.ts';
import pokemonGenerations from '../pokemon/data/pokemon-generations.json' with { type: 'json' };
import {
  calculateScore,
  getAnswerPoints,
  getResponseTime,
  getSpeedBonusPoints,
} from '../quiz/scoring.ts';
import type {
  AnswerObservation,
  AnswerResult,
  GameResult,
} from '../quiz/types.ts';
import type { RoundCompletion } from './progress.ts';
import {
  dailyDateSchema,
  isRecord,
  utcTimestampSchema,
  uuidSchema,
} from '../../lib/validation.ts';
import { defaultGameSettings } from '../settings/game-settings.ts';
import { gameVersions } from '../versions.ts';

const strings = (max = 100) =>
  z
    .array(z.string().min(1).max(200))
    .max(max)
    .refine((values) => new Set(values).size === values.length);
const archivedQuestionSchema = z.object({
  id: z.string().min(1).max(2000),
  prompt: z.discriminatedUnion('kind', [
    z.object({
      kind: z.literal('text'),
      text: z.string().max(4000),
      supporting_text: z.string().max(4000).optional(),
    }),
    z.object({
      kind: z.literal('pokemon'),
      name: z.string().max(4000),
      before: z.string().max(4000),
      after: z.string().max(4000),
      dex_number: z.int(),
      supporting_text: z.string().max(4000).optional(),
    }),
  ]),
  interaction: z.enum(['single-choice', 'multi-select', 'search']),
  options: answerObservationSchema.shape.options,
  expected: answerObservationSchema.shape.expected,
  selected: answerObservationSchema.shape.selected,
  labels: answerObservationSchema.shape.labels,
  clues: answerObservationSchema.shape.clues,
  supplied_clues: answerObservationSchema.shape.suppliedClues,
  context: answerObservationSchema.shape.context,
  difficulty: answerObservationSchema.shape.difficulty,
});
type ArchivedQuestion = z.infer<typeof archivedQuestionSchema>;
const roundAnswerSchema = z.object({
  question: archivedQuestionSchema.refine(
    (question) =>
      answerObservationSchema.safeParse(liveQuestion(question)).success,
  ),
  subject: answerSubjectSchema,
  category: z.enum(questionCategories),
  question_type: z.enum([...questionTypes, 'champion']),
  clues_used: z.int().min(0).max(4),
  response_ms: z.int().min(0).max(86_400_000),
  unassisted_search: z.boolean(),
});
const configSchema = z.object({
  training_mode: z.enum(['league', 'custom']),
  difficulty: difficultySchema.optional(),
  question_selection: z.enum(['automatic', 'custom']).optional(),
  generations: z
    .array(z.enum(generations))
    .min(1)
    .max(20)
    .refine((values) => new Set(values).size === values.length),
  form_groups: z
    .array(z.enum(formGroups))
    .min(1)
    .max(20)
    .refine((values) => new Set(values).size === values.length),
  question_types: z
    .array(z.enum(questionTypes))
    .min(1)
    .max(100)
    .refine((values) => new Set(values).size === values.length),
  auto_types: z
    .array(z.enum(questionTypes))
    .max(100)
    .refine((values) => new Set(values).size === values.length),
  daily_track: z.custom<DailyTrack>(isDailyTrack).optional(),
});
const roundDataSchema = z.object({
  score_version: z
    .int()
    .refine((value): boolean => value === 1 || value === 2)
    .optional(),
  config: configSchema,
  answers: z.array(roundAnswerSchema),
  found: strings(2000).refine((names) =>
    names.every((name) => Object.hasOwn(pokemonGenerations, name)),
  ),
  victory: z
    .object({
      trainer_name: z.string().max(20),
      pokemon: strings(20).min(1),
    })
    .nullable(),
});
export type RoundData = z.infer<typeof roundDataSchema>;
const baseRoundSchema = z.object({
  id: uuidSchema,
  mode: z.enum(['training', 'daily', 'league']),
  day: dailyDateSchema.nullable(),
  puzzle_id: z
    .string()
    .regex(/^[a-f0-9]{64}$/)
    .nullable(),
  started_on: dailyDateSchema.nullable(),
  completed_at: utcTimestampSchema,
  credited: z.boolean(),
  data: roundDataSchema,
});
export type RoundFact = z.infer<typeof baseRoundSchema>;
const roundFactSchema = z.discriminatedUnion('mode', [
  baseRoundSchema.extend({
    mode: z.literal('training'),
    day: z.null(),
    puzzle_id: z.null(),
    started_on: z.null(),
    credited: z.literal(true),
  }),
  baseRoundSchema.extend({
    mode: z.literal('league'),
    day: z.null(),
    puzzle_id: z.null(),
    started_on: z.null(),
    credited: z.literal(true),
  }),
  baseRoundSchema.extend({
    mode: z.literal('daily'),
    day: dailyDateSchema,
    puzzle_id: z.string().regex(/^[a-f0-9]{64}$/),
    started_on: dailyDateSchema,
  }),
]);

const archiveQuestion = (observation: AnswerObservation): ArchivedQuestion => ({
  id: observation.questionId,
  prompt:
    observation.prompt.kind === 'text'
      ? {
          kind: 'text',
          text: observation.prompt.text,
          ...(observation.prompt.supportingText
            ? { supporting_text: observation.prompt.supportingText }
            : {}),
        }
      : {
          kind: 'pokemon',
          name: observation.prompt.name,
          before: observation.prompt.before,
          after: observation.prompt.after,
          dex_number: observation.prompt.dexNumber,
          ...(observation.prompt.supportingText
            ? { supporting_text: observation.prompt.supportingText }
            : {}),
        },
  interaction: observation.interaction,
  options: observation.options,
  expected: observation.expected,
  selected: observation.selected,
  ...(observation.labels ? { labels: observation.labels } : {}),
  ...(observation.clues ? { clues: observation.clues } : {}),
  ...(observation.suppliedClues
    ? { supplied_clues: observation.suppliedClues }
    : {}),
  ...(observation.context ? { context: observation.context } : {}),
  ...(observation.difficulty ? { difficulty: observation.difficulty } : {}),
});

const liveQuestion = (question: ArchivedQuestion): AnswerObservation => {
  const prompt =
    question.prompt.kind === 'text'
      ? {
          kind: 'text' as const,
          text: question.prompt.text,
          ...(question.prompt.supporting_text === undefined
            ? {}
            : { supportingText: question.prompt.supporting_text }),
        }
      : {
          kind: 'pokemon' as const,
          name: question.prompt.name,
          before: question.prompt.before,
          after: question.prompt.after,
          dexNumber: question.prompt.dex_number,
          ...(question.prompt.supporting_text === undefined
            ? {}
            : { supportingText: question.prompt.supporting_text }),
        };
  return {
    questionId: question.id,
    prompt,
    interaction: question.interaction,
    options: question.options,
    expected: question.expected,
    selected: question.selected,
    ...(question.labels ? { labels: question.labels } : {}),
    ...(question.clues ? { clues: question.clues } : {}),
    ...(question.supplied_clues
      ? { suppliedClues: question.supplied_clues }
      : {}),
    ...(question.context ? { context: question.context } : {}),
    ...(question.difficulty ? { difficulty: question.difficulty } : {}),
  };
};

export function archiveCompletion(
  completion: RoundCompletion,
  credited = true,
  startedOn = completion.completedAt.slice(0, 10),
): RoundFact {
  return {
    id: completion.completionId,
    mode: completion.mode,
    day: completion.dailyDate,
    puzzle_id: completion.mode === 'daily' ? completion.result.puzzleId! : null,
    started_on: completion.mode === 'daily' ? startedOn : null,
    completed_at: completion.completedAt,
    credited,
    data: {
      score_version: completion.scoreVersion,
      config: {
        training_mode: completion.training.trainingMode,
        ...(completion.training.difficulty
          ? { difficulty: completion.training.difficulty }
          : {}),
        ...(completion.training.questionSelection
          ? { question_selection: completion.training.questionSelection }
          : {}),
        generations: completion.training.generations,
        form_groups:
          completion.training.formGroups ?? defaultGameSettings.formGroups,
        question_types: completion.training.questionTypes,
        auto_types: completion.training.automaticQuestionTypes ?? [],
        ...(completion.result.dailyTrack
          ? { daily_track: completion.result.dailyTrack }
          : {}),
      },
      answers: completion.result.answers.map((answer) => ({
        question: archiveQuestion(answer.observation!),
        subject: {
          kind: answer.subject.kind,
          ...(answer.subject.name === undefined
            ? {}
            : { name: answer.subject.name }),
          ...(answer.subject.generation === undefined
            ? {}
            : { generation: answer.subject.generation }),
        },
        category: answer.category,
        question_type: answer.questionType,
        clues_used: answer.cluesUsed,
        response_ms: answer.responseMilliseconds!,
        unassisted_search: answer.unassistedSearch ?? answer.cluesUsed === 0,
      })),
      found: completion.discoveries,
      victory: completion.victory
        ? {
            trainer_name: completion.victory.trainerName,
            pokemon: completion.victory.pokemon,
          }
        : null,
    },
  };
}

export function scoreRound(
  round: Pick<RoundFact, 'mode' | 'data' | 'puzzle_id'>,
): GameResult {
  const answers: AnswerResult[] = round.data.answers.map((answer) => {
    const observation = liveQuestion(answer.question);
    const correct = observationCorrect(observation);
    const points = getAnswerPoints(answer, correct, answer.clues_used);
    return {
      observation,
      subject: answer.subject,
      category: answer.category,
      questionType: answer.question_type,
      cluesUsed: answer.clues_used,
      responseMilliseconds: answer.response_ms,
      unassistedSearch: answer.unassisted_search,
      correct,
      points,
      speedBonus: getSpeedBonusPoints(points, answer.response_ms),
    };
  });
  const config = round.data.config;
  const multipliers =
    round.mode === 'training'
      ? getTrainingScoreMultipliers(
          {
            difficulty: config.difficulty,
            generations: config.generations,
            formGroups: config.form_groups,
            questionTypes: config.question_types,
          },
          answers,
        )
      : undefined;
  return {
    answers,
    correctCount: answers.filter((answer) => answer.correct).length,
    questionCount:
      round.mode === 'training' ? 10 : round.mode === 'daily' ? 5 : 15,
    ...getResponseTime(answers),
    score: calculateScore(
      answers,
      multipliers,
      undefined,
      round.data.score_version ?? 1,
    ),
    ...(multipliers ? { scoreMultipliers: multipliers } : {}),
    ...(round.mode === 'daily'
      ? {
          ...(config.daily_track
            ? { dailyTrack: config.daily_track }
            : config.difficulty
              ? {
                  dailyTrack: {
                    difficulty: config.difficulty,
                    scope:
                      config.generations.length === 1 &&
                      config.generations[0] === 'I'
                        ? ('gen-i' as const)
                        : ('all' as const),
                  },
                }
              : {}),
          puzzleId: round.puzzle_id!,
        }
      : {}),
    contentVersion: gameVersions.content,
    scoreVersion: round.data.score_version ?? 1,
  };
}

export function validateRoundFact(value: unknown): value is RoundFact {
  const parsed = roundFactSchema.safeParse(value);
  if (!parsed.success) return false;
  const round = parsed.data;
  const count =
    round.mode === 'training' ? 10 : round.mode === 'daily' ? 5 : 15;
  if (
    !round.data.answers.length ||
    round.data.answers.length > count ||
    (round.mode !== 'league' && round.data.answers.length !== count) ||
    (round.mode !== 'daily' && round.data.config.daily_track !== undefined)
  )
    return false;
  return (
    round.mode !== 'league' ||
    Boolean(round.data.victory) === isLeagueVictory(scoreRound(round))
  );
}

export type RoundUpload = Omit<RoundFact, 'credited'>;

export function validateRoundUpload(value: unknown): value is RoundUpload {
  return (
    isRecord(value) &&
    !Object.hasOwn(value, 'credited') &&
    validateRoundFact({ ...value, credited: true })
  );
}
import { z } from 'zod';
