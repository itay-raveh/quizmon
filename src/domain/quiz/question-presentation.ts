import { z } from 'zod';
import { questionRules } from '../../question-rules.ts';
import type { QuestionData } from './types.ts';

const answerViewSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('text'),
    detail: z.enum(['nature', 'move']).optional(),
    layout: z.literal('statements').optional(),
  }),
  z.object({
    kind: z.literal('pokemon'),
    revealTypes: z.literal('after-answer').optional(),
    layout: z.literal('counter-pick').optional(),
  }),
  z.object({ kind: z.literal('type') }),
  z.object({ kind: z.literal('item') }),
]);

export const questionViewSchema = z.object({
  answer: answerViewSchema,
  subject: z
    .object({
      identity: z.literal('after-answer').optional(),
      portrait: z.literal('after-answer').optional(),
      types: z.literal('after-answer').optional(),
      inlineItem: z.enum(['sprite', 'named']).optional(),
    })
    .optional(),
});

export type QuestionView = z.infer<typeof questionViewSchema>;

export const getQuestionView = (question: QuestionData): QuestionView => {
  if (question.view) return question.view;
  if (question.questionType === 'archived')
    return {
      answer: question.optionImages
        ? { kind: 'item' }
        : question.optionVisuals
          ? { kind: 'pokemon' }
          : { kind: 'text' },
    };
  const row = questionRules[question.questionType] as {
    standard?: { view: QuestionView };
    levels: Record<number, { view: QuestionView }>;
  };
  const level = question.variantLevel;
  const resolved =
    level === undefined
      ? row.standard
      : Object.entries(row.levels)
          .filter(([key]) => Number(key) <= level)
          .at(-1)?.[1];
  const view = resolved?.view ?? Object.values(row.levels)[0]!.view;
  if (question.optionImages) return { ...view, answer: { kind: 'item' } };
  if (
    question.questionType === 'field-notes' &&
    question.answer.interaction === 'search'
  )
    return {
      ...view,
      subject: { ...view.subject, portrait: 'after-answer' },
    };
  return view;
};
