import { z } from 'zod';
import { isQuestionRendering } from './question-rendering.ts';
import { isQuestionSubject } from './subject.ts';
import { difficultySchema } from './difficulty.ts';
import { generations, statNames } from '../pokemon/types.ts';
import { questionTypes } from './questions/definitions.ts';
import { questionCategories, type QuestionData } from './types.ts';

export interface QuestionLineup {
  seed: string;
  contentVersion: number;
  questions: QuestionData[];
}

const text = z.string().max(10000);
const strings = z.array(text);
const nonnegativeInteger = z.int().min(0);
const unique = (values: string[]) => new Set(values).size === values.length;
const sprite = z.object({
  dexNumber: nonnegativeInteger,
  src: text,
  types: strings,
  silhouette: z.boolean().optional(),
});
const generationClue = z.object({
  kind: z.literal('generation'),
  generation: z.enum(generations),
  types: strings,
});
const media = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('none') }),
  z.object({ kind: z.literal('pixel-sprite'), src: text }),
  z.object({
    kind: z.literal('sprite'),
    src: text,
    silhouette: z.boolean().optional(),
    revealAt: nonnegativeInteger.optional(),
  }),
  z.object({
    kind: z.literal('pixel-peek'),
    src: text,
    focusX: z.number(),
    focusY: z.number(),
    zoom: z.number().min(1).optional(),
  }),
]);
const stages = z.record(z.string(), sprite);
const evolutionEndpoints = { before: text, after: text, stages };
const multiplier = { multiplier: z.number().min(0) };
const direction = z.enum(['highest', 'lowest']);
const visual = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('evolution-endpoints'), ...evolutionEndpoints }),
  z.object({ kind: z.literal('evolution-link'), ...evolutionEndpoints }),
  z.object({ kind: z.literal('type-check') }),
  z.object({ kind: z.literal('type-twins') }),
  z.object({ kind: z.literal('type-roundup'), type: text }),
  z.object({
    kind: z.literal('generation-roundup'),
    generation: z.enum(generations),
  }),
  z.object({
    kind: z.literal('evolution-shift'),
    evolution: sprite.extend({ name: text }),
    gainedType: text,
  }),
  z.object({
    kind: z.literal('stat-showdown'),
    stat: z.enum(statNames),
    direction,
  }),
  z.object({
    kind: z.literal('measurement-comparison'),
    measurement: z.enum(['height', 'weight']),
    direction,
  }),
  z.object({ kind: z.literal('type-matchup'), ...multiplier }),
  z.object({ kind: z.literal('counter-pick'), ...multiplier }),
]);
const prompt = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('text'),
    text,
    description: text.optional(),
    supportingText: text.optional(),
  }),
  z.object({
    kind: z.literal('pokemon'),
    before: text,
    after: text,
    name: text,
    supportingText: text.optional(),
    dexNumber: nonnegativeInteger,
  }),
]);
const question = z
  .object({
    repetition: z.object({
      identity: text.min(1),
      subjects: strings,
      primary: strings,
      distractors: strings,
    }),
    id: text,
    subject: z.custom(isQuestionSubject),
    questionType: z.enum([...questionTypes, 'champion']),
    category: z.enum(questionCategories),
    options: strings.min(1).refine(unique),
    answer: z.object({
      correctOptions: strings.min(1).refine(unique),
      interaction: z.enum(['single-choice', 'search', 'multi-select']),
    }),
    prompt,
    media,
    optionDetails: z
      .record(
        z.string(),
        z.array(z.object({ value: text, label: text })).min(1),
      )
      .optional(),
    optionLabels: z.record(z.string(), text).optional(),
    optionImages: z.record(z.string(), text).optional(),
    optionReveals: z.record(z.string(), text).optional(),
    explanation: text.optional(),
    context: text.optional(),
    variantLevel: difficultySchema.optional(),
    rendering: z.custom(isQuestionRendering).optional(),
    namesOnly: z.boolean().optional(),
    showTypes: z.boolean().optional(),
    assistanceUsed: nonnegativeInteger.optional(),
    initialClues: nonnegativeInteger.optional(),
    rulesVersion: nonnegativeInteger.optional(),
    suppliedClues: strings.optional(),
    assistanceAllowed: z.boolean().optional(),
    visual: visual.optional(),
    concealOptionLabels: z.boolean().optional(),
    clues: z.array(z.union([text, generationClue])).optional(),
    optionDexNumbers: z.record(z.string(), nonnegativeInteger).optional(),
    optionStats: z.record(z.string(), nonnegativeInteger).optional(),
    optionVisuals: z.record(z.string(), sprite).optional(),
    optionGenerations: z.record(z.string(), z.enum(generations)).optional(),
    optionClassifications: z
      .record(z.string(), z.enum(['Legendary', 'Mythical', 'Neither']))
      .optional(),
    searchOptions: z
      .array(
        z.object({
          name: text,
          dexNumber: nonnegativeInteger,
          sprite: text.nullable().optional(),
        }),
      )
      .optional(),
  })
  .refine(
    ({ answer, options }) =>
      answer.correctOptions.every((option) => options.includes(option)) &&
      (answer.interaction === 'multi-select' ||
        answer.correctOptions.length === 1),
  );

export const isQuestionData = (value: unknown): value is QuestionData =>
  question.safeParse(value).success;

const lineup = z.object({
  seed: text.min(1).max(200),
  contentVersion: nonnegativeInteger,
  questions: z.array(question),
});

export const isQuestionLineup = (value: unknown): value is QuestionLineup =>
  lineup.safeParse(value).success;
