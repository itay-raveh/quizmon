import { z } from 'zod';
import { generations } from '../pokemon/types.ts';
import { subjectKinds } from './types.ts';

export const answerSubjectSchema = z.object({
  kind: z.enum(subjectKinds),
  name: z.string().min(1).max(200).optional(),
  generation: z.enum(generations).optional(),
});

export const questionSubjectSchema = z.discriminatedUnion('kind', [
  answerSubjectSchema.extend({
    kind: z.literal('pokemon'),
    name: z.string().min(1).max(200),
    generation: z.enum(generations),
    types: z.array(z.string()),
  }),
  answerSubjectSchema.extend({
    kind: z.enum(subjectKinds.filter((kind) => kind !== 'pokemon')),
    name: z.string().min(1).max(200),
    generation: z.enum(generations),
    types: z.never().optional(),
  }),
]);
