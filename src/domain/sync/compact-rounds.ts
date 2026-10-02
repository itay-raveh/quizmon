import { z } from 'zod';
import {
  calculateScore,
  getAnswerPoints,
  getResponseTime,
  getSpeedBonusPoints,
} from '../quiz/scoring.ts';
import {
  getLegacyTrainingScoreMultipliers,
  getTrainingScoreMultipliers,
} from '../quiz/score-multipliers.ts';
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
const currentTraining = training.extend({ scoreVersion: z.literal(2) });
const legacyTraining = training.extend({
  scoreVersion: z.undefined().optional(),
});

const base = z.object({
  id: uuidSchema,
  completedAt: utcTimestampSchema,
  answers: z.array(compactAnswerSchema).min(1),
});

const currentTrainingRound = base
  .extend({
    mode: z.literal('training'),
    training: currentTraining,
    answers: z
      .array(compactAnswerSchema.extend({ ruleLevel: levelSchema }))
      .length(10),
  })
  .refine(({ training: settings, answers }) => {
    const levels = new Map<string, number>();
    return answers.every((answer) => {
      if (answer.type === 'champion' || answer.ruleLevel > settings.level)
        return false;
      const previous = levels.get(answer.type);
      levels.set(answer.type, answer.ruleLevel);
      return previous === undefined || previous === answer.ruleLevel;
    });
  });

export const compactRoundSchema = z.union([
  currentTrainingRound,
  base.extend({
    mode: z.literal('training'),
    training: legacyTraining,
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
  const scoring = completion.result.scoreMultipliers;
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
        ...(scoring?.version === 2
          ? {
              ruleLevel: scoring.questionTypes.find(
                (factor) => factor.questionType === answer.questionType,
              )?.ruleLevel,
            }
          : {}),
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
            ...(scoring?.version === 2 ? { scoreVersion: 2 as const } : {}),
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
    const points = getAnswerPoints({ category }, correct, cluesUsed);
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
      points,
      speedBonus: getSpeedBonusPoints(points, answer.responseMs),
    };
  });
  const multipliers =
    round.mode === 'training'
      ? round.training.scoreVersion === 2
        ? getTrainingScoreMultipliers(
            {
              level: round.training.level,
              generations: round.training.generations,
              questionTypes: questionTypes.filter((type) =>
                round.answers.some((answer) => answer.type === type),
              ),
            },
            round.answers.map((answer) => ({
              questionType: answer.type,
              variantLevel:
                'ruleLevel' in answer ? answer.ruleLevel : undefined,
            })),
          )
        : getLegacyTrainingScoreMultipliers(
            {
              level: round.training.level,
              generations: round.training.generations,
              formGroups: round.training.formGroups,
              questionTypes: questionTypes.filter((type) =>
                round.answers.some((answer) => answer.type === type),
              ),
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
    score: calculateScore(answers, multipliers),
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
    ...(multipliers ? { scoreMultipliers: multipliers } : {}),
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
