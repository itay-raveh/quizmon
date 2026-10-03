import { z } from 'zod';
import {
  getResponseTime,
  getRoundAnswerLevel,
  getScoreBreakdown,
} from '../quiz/scoring.ts';
import {
  questionDefinitions,
  questionTypes,
} from '../quiz/questions/definitions.ts';
import { levelSchema } from '../quiz/level.ts';
import { formGroups, generations, type Generation } from '../pokemon/types.ts';
import pokemonGenerations from '../pokemon/data/pokemon-generations.json' with { type: 'json' };
import {
  dailyDateSchema,
  utcTimestampSchema,
  uuidSchema,
} from '../../lib/validation.ts';
import type { AnswerResult, GameResult } from '../quiz/types.ts';
import type { RoundCompletion } from './progress.ts';

const values = z
  .array(z.string().min(1).max(2000))
  .max(100)
  .refine((items) => new Set(items).size === items.length);

const compactAnswerSchema = z.object({
  type: z.enum([...questionTypes, 'champion']),
  subject: z.string().min(1).max(200),
  options: values.length(4).optional(),
  expected: values.min(1),
  selected: values,
  responseMs: z.int().min(0).max(86_400_000),
  cluesUsed: z.int().min(1).max(4).optional(),
});

const training = z.object({
  level: levelSchema,
  generations: z.array(z.enum(generations)).min(1),
  formGroups: z.array(z.enum(formGroups)).min(1),
});

const base = z.object({
  id: uuidSchema,
  completedAt: utcTimestampSchema,
  answers: z.array(compactAnswerSchema).min(1),
});

export const compactRoundSchema = z.discriminatedUnion('mode', [
  base.extend({
    mode: z.literal('training'),
    training,
    answers: z.array(compactAnswerSchema).length(10),
  }),
  base.extend({
    mode: z.literal('daily'),
    day: dailyDateSchema,
    answers: z.array(compactAnswerSchema).length(5),
  }),
  base.extend({
    mode: z.literal('league'),
    answers: z.array(compactAnswerSchema).max(15),
  }),
]);

export type CompactRound = z.infer<typeof compactRoundSchema>;

export function compactCompletion(completion: RoundCompletion): CompactRound {
  const common = {
    id: completion.completionId,
    completedAt: completion.completedAt,
    answers: completion.result.answers.map((answer) => {
      const observation = answer.observation;
      if (
        !observation ||
        !answer.subject.name ||
        answer.responseMilliseconds === undefined
      )
        throw new Error('A completed answer is missing scoring facts.');
      return {
        type: answer.questionType,
        subject: answer.subject.name,
        ...(observation.interaction !== 'search' &&
        observation.options.length === 4
          ? { options: observation.options }
          : {}),
        expected: observation.expected,
        selected: observation.selected,
        responseMs: answer.responseMilliseconds,
        ...(answer.questionType === 'champion' && answer.cluesUsed > 0
          ? { cluesUsed: answer.cluesUsed }
          : {}),
      };
    }),
  };
  return compactRoundSchema.parse(
    completion.mode === 'training'
      ? {
          ...common,
          mode: 'training',
          training: {
            level: completion.training.level,
            generations: completion.training.generations,
            formGroups: completion.training.formGroups,
          },
        }
      : completion.mode === 'daily'
        ? { ...common, mode: 'daily', day: completion.dailyDate }
        : { ...common, mode: 'league' },
  );
}

const pokemonGeneration = pokemonGenerations as Record<string, Generation>;

export function scoreCompactRound(round: CompactRound): GameResult {
  const answers: AnswerResult[] = round.answers.map((answer) => {
    const definition =
      answer.type === 'champion' ? null : questionDefinitions[answer.type];
    const category = definition?.category ?? 'champion';
    const subjectKind = definition?.subjectKind ?? 'pokemon';
    const generation =
      subjectKind === 'pokemon' ? pokemonGeneration[answer.subject] : undefined;
    const correct =
      answer.selected.length === answer.expected.length &&
      answer.expected.every((value) => answer.selected.includes(value));
    const cluesUsed = answer.cluesUsed ?? 0;
    return {
      category,
      questionType: answer.type,
      subject: {
        kind: subjectKind,
        name: answer.subject,
        ...(generation ? { generation } : {}),
      },
      cluesUsed,
      responseMilliseconds: answer.responseMs,
      correct,
      points: 0,
      speedBonus: 0,
    };
  });
  const mode =
    round.mode === 'daily'
      ? { kind: 'daily' as const, date: round.day }
      : { kind: round.mode };
  const scoring = getScoreBreakdown(answers, (index) =>
    getRoundAnswerLevel(
      mode,
      round.mode === 'training' ? round.training.level : undefined,
      index,
    ),
  );
  return {
    answers: answers.map((answer, index) => ({
      ...answer,
      points: scoring.awards[index]!.points,
      speedBonus: scoring.awards[index]!.speedBonus,
    })),
    correctCount: answers.filter((answer) => answer.correct).length,
    questionCount:
      round.mode === 'training' ? 10 : round.mode === 'daily' ? 5 : 15,
    ...getResponseTime(answers),
    score: scoring.score,
    ...(round.mode === 'training'
      ? {
          rules: {
            level: round.training.level,
            generations: round.training.generations,
            formGroups: round.training.formGroups,
            questionTypes: questionTypes.filter((type) =>
              round.answers.some((answer) => answer.type === type),
            ),
          },
        }
      : {}),
  };
}

export function discoverCompactRound(round: CompactRound): string[] {
  const found = new Set<string>();
  for (const answer of round.answers) {
    if (
      answer.selected.length !== answer.expected.length ||
      !answer.expected.every((value) => answer.selected.includes(value))
    )
      continue;
    const definition =
      answer.type === 'champion' ? null : questionDefinitions[answer.type];
    if (
      (definition?.subjectKind ?? 'pokemon') === 'pokemon' &&
      pokemonGeneration[answer.subject]
    )
      found.add(answer.subject);
    if (answer.type === 'champion' || definition?.answerIsPokemon)
      for (const name of [...answer.expected, ...(answer.options ?? [])])
        if (pokemonGeneration[name]) found.add(name);
  }
  return [...found].sort();
}
