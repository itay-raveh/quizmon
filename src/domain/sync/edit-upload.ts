import { z } from 'zod';
import pokemonGenerations from '../pokemon/data/pokemon-generations.json' with { type: 'json' };
import { formGroups, generations } from '../pokemon/types.ts';
import { isTrainerAvatar } from '../player/trainer-avatars.ts';
import {
  trainerSpecialtyDetails,
  type TrainerSpecialty,
} from '../player/trainer-progression.ts';
import { questionTypes } from '../quiz/questions/definitions.ts';
import {
  answerFlows,
  timerDisplays,
  trainingModes,
} from '../settings/types.ts';
import { uuidSchema } from '../../lib/validation.ts';

const id = uuidSchema;
const choiceArray = <T extends readonly string[]>(choices: T) =>
  z
    .array(z.enum(choices))
    .min(1)
    .refine((values) => values.length === new Set(values).size);
const base = { id };

export const editUploadSchema = z.discriminatedUnion('unit', [
  z.object({
    ...base,
    unit: z.literal('name'),
    value: z
      .string()
      .refine((value) => value.length <= 20 && value === value.trim()),
  }),
  z.object({
    ...base,
    unit: z.literal('avatar'),
    value: z.custom<string>(isTrainerAvatar).nullable(),
  }),
  z.object({
    ...base,
    unit: z.literal('partner'),
    value: z
      .custom<string>(
        (value) =>
          typeof value === 'string' && Object.hasOwn(pokemonGenerations, value),
      )
      .nullable(),
  }),
  z.object({
    ...base,
    unit: z.literal('specialty'),
    value: z
      .enum(
        Object.keys(trainerSpecialtyDetails) as [
          TrainerSpecialty,
          ...TrainerSpecialty[],
        ],
      )
      .nullable(),
  }),
  z.object({
    ...base,
    unit: z.literal('answer_flow'),
    value: z.enum(answerFlows),
  }),
  z.object({
    ...base,
    unit: z.literal('timer_display'),
    value: z.enum(timerDisplays),
  }),
  z.object({
    ...base,
    unit: z.literal('training'),
    value: z.object({
      training_mode: z.enum(trainingModes),
      difficulty: z.number().int().min(1).max(5),
      question_selection: z.enum(['automatic', 'custom']),
      generations: choiceArray(generations),
      form_groups: choiceArray(formGroups),
      question_types: choiceArray(questionTypes),
      auto_types: choiceArray(questionTypes).nullable().optional(),
    }),
  }),
]);
