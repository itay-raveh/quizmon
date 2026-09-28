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
    /** Format a nature or move explanation beside a text answer. */
    detail: z.enum(['nature', 'move']).optional(),
    /** Use the full-width statement answer layout. */
    layout: z.literal('statements').optional(),
  }),
  z.object({
    kind: z.literal('pokemon'),
    /** Use the counter-pick answer layout. */
    layout: z.literal('superEffectiveAttacker').optional(),
  }),
  z.object({ kind: z.literal('type') }),
  z.object({ kind: z.literal('item') }),
]);

/** Saved answer and subject presentation shape, separate from visibility. */
export const questionViewSchema = z.object({
  answer: answerViewSchema,
  subject: z
    .object({
      /** Show an item sprite or name inline with the prompt. */
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
  return view;
};
