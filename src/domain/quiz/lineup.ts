import { questionViewSchema } from './presentation.ts';
import { z } from 'zod';
import { questionRenderingSchema } from './rendering.ts';
import { questionSubjectSchema } from './subject.ts';
import { difficultySchema } from './difficulty.ts';
import { generations, statNames } from '../pokemon/types.ts';
import { questionTypes } from './questions/definitions.ts';
import { questionCategories, type QuestionData } from './types.ts';

export interface QuestionLineup {
  seed: string;
  questions: QuestionData[];
}

const text = z.string().max(10000);
const strings = z.array(text);
const nonnegativeInteger = z.int().min(0);
const unique = (values: string[]) => new Set(values).size === values.length;
const sprite = z.object({
  dexNumber: nonnegativeInteger,
  src: text.nullable(),
  types: strings,
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
  }),
  z.object({
    kind: z.literal('pokemonFromPixelCrop'),
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
  z.object({ kind: z.literal('evolutionChain'), ...evolutionEndpoints }),
  z.object({ kind: z.literal('pokemonTypes') }),
  z.object({ kind: z.literal('dualTypeMatch') }),
  z.object({ kind: z.literal('pokemonByType'), type: text }),
  z.object({
    kind: z.literal('pokemonByGeneration'),
    generation: z.enum(generations),
  }),
  z.object({
    kind: z.literal('evolutionGainedType'),
    evolution: sprite.extend({ name: text }),
    gainedType: text,
  }),
  z.object({
    kind: z.literal('statExtremes'),
    stat: z.enum(statNames),
    direction,
  }),
  z.object({
    kind: z.literal('measurement-comparison'),
    measurement: z.enum(['height', 'weight']),
    direction,
  }),
  z.object({ kind: z.literal('typeMatchup'), ...multiplier }),
  z.object({ kind: z.literal('superEffectiveAttacker'), ...multiplier }),
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
  z.object({
    kind: z.literal('item'),
    before: text,
    after: text,
    name: text,
    sprite: text.optional(),
    supportingText: text.optional(),
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
    subject: questionSubjectSchema,
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
    rendering: questionRenderingSchema.optional(),
    view: questionViewSchema.optional(),
    namesOnly: z.boolean().optional(),
    assistanceUsed: nonnegativeInteger.optional(),
    initialClues: nonnegativeInteger.optional(),
    suppliedClues: strings.optional(),
    assistanceAllowed: z.boolean().optional(),
    visual: visual.optional(),
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
          label: text.optional(),
          dexNumber: nonnegativeInteger.optional(),
          sprite: text.nullable().optional(),
          types: strings.optional(),
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

/** Validate saved questions against current IDs and complete rendering snapshots. */
export const savedQuestionSchema = question;

export const isQuestionData = (value: unknown): value is QuestionData =>
  question.safeParse(value).success;
