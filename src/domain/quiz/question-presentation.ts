import { z } from 'zod';
import { questionRules } from '../../question-rules.ts';
import {
  resolveDifficultyVariant,
  type DifficultyVariants,
} from './difficulty.ts';
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
    layout: z.literal('super-effective-attacker').optional(),
  }),
  z.object({ kind: z.literal('type') }),
  z.object({ kind: z.literal('item') }),
]);

/** Saved answer and subject presentation shape, separate from visibility. */
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

/** Answer layout and subject treatment; field visibility belongs to rendering. */
export type QuestionView = z.infer<typeof questionViewSchema>;

/** Use the saved view when present; otherwise resolve the current family view. */
export const getQuestionView = (question: QuestionData): QuestionView => {
  if (question.view) return question.view;
  const row = questionRules[question.questionType] as {
    unleveled?: { view: QuestionView };
    levels: DifficultyVariants<{ view: QuestionView }>;
  };
  const level = question.variantLevel;
  const resolved =
    level === undefined
      ? row.unleveled
      : resolveDifficultyVariant(row.levels, level)?.variant;
  const view = resolved?.view ?? Object.values(row.levels)[0]!.view;
  if (question.optionImages) return { ...view, answer: { kind: 'item' } };
  if (
    question.questionType === 'pokedex-entry-match' &&
    question.answer.interaction === 'search'
  )
    return {
      ...view,
      subject: { ...view.subject, portrait: 'after-answer' },
    };
  return view;
};
