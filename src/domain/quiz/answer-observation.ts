import { z } from 'zod';
import { generations } from '../pokemon/types.ts';
import { difficultySchema } from './difficulty.ts';
import type { QuestionData } from './types.ts';

const text = z.string().max(4000);
const choices = z
  .array(z.string().max(2000))
  .max(100)
  .refine((values) => new Set(values).size === values.length);
const prompt = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('text'),
    text,
    description: text.optional(),
    supportingText: text.optional(),
  }),
  z.object({
    kind: z.literal('pokemon'),
    name: text,
    before: text,
    after: text,
    dexNumber: z.int(),
    supportingText: text.optional(),
  }),
]);
export const answerObservationSchema = z
  .object({
    questionId: z.string().min(1).max(2000),
    prompt,
    labels: z
      .record(text, text)
      .refine((labels) => Object.keys(labels).length <= 100)
      .optional(),
    clues: z
      .array(
        z.union([
          text,
          z.object({
            kind: z.literal('generation'),
            generation: z.enum(generations),
            types: choices,
          }),
        ]),
      )
      .max(100)
      .optional(),
    suppliedClues: choices.optional(),
    context: text.optional(),
    difficulty: difficultySchema.optional(),
    interaction: z.enum(['single-choice', 'multi-select', 'search']),
    options: choices,
    expected: choices.refine((values) => values.length > 0),
    selected: choices,
  })
  .refine(
    ({ interaction, selected }) =>
      interaction === 'multi-select' || selected.length <= 1,
  );

export type AnswerObservation = z.infer<typeof answerObservationSchema>;

export function observeAnswer(
  question: QuestionData,
  selected: string[],
): AnswerObservation {
  return {
    questionId: question.id,
    ...(question.optionLabels ? { labels: { ...question.optionLabels } } : {}),
    ...(question.clues ? { clues: structuredClone(question.clues) } : {}),
    ...(question.suppliedClues
      ? { suppliedClues: [...question.suppliedClues] }
      : {}),
    prompt: structuredClone(question.prompt),
    ...(question.context ? { context: question.context } : {}),
    ...(question.variantLevel ? { difficulty: question.variantLevel } : {}),
    interaction: question.answer.interaction,
    options: [...question.options],
    expected: [...question.answer.correctOptions],
    selected: [...selected],
  };
}

export function observationCorrect(value: AnswerObservation) {
  return (
    value.selected.length === value.expected.length &&
    value.expected.every((answer) => value.selected.includes(answer))
  );
}
