import { z } from 'zod';
import type { GameSettings } from '../settings/types.ts';
import { formGroups, generations } from '../pokemon/types.ts';
import { levelSchema } from './level.ts';
import { questionTypes } from './questions/definitions.ts';
import { type GameResult } from './types.ts';

const roundRulesSchema = z.object({
  automaticQuestionTypes: z.array(z.enum(questionTypes)).min(1).optional(),
  level: levelSchema,
  generations: z.array(z.enum(generations)).min(1),
  formGroups: z.array(z.enum(formGroups)).min(1),
  questionTypes: z.array(z.enum(questionTypes)).min(1),
});

export const savedRoundRulesSchema = roundRulesSchema;

export type RoundRules = z.infer<typeof savedRoundRulesSchema>;

export const getRulesScoreKey = (
  result: Pick<GameResult, 'rules'>,
): `rules:${string}` | undefined => {
  const rules = result.rules;
  if (!rules) return undefined;
  const ordered = (values: readonly string[]) => [...new Set(values)].sort();
  return `rules:${JSON.stringify([
    rules.level,
    ordered(rules.generations),
    ordered(rules.formGroups),
    ordered(rules.questionTypes),
  ])}`;
};

export const snapshotRoundRules = (
  settings: GameSettings,
): RoundRules | undefined => {
  return settings.level
    ? {
        ...(settings.automaticQuestionTypes
          ? { automaticQuestionTypes: [...settings.automaticQuestionTypes] }
          : {}),
        level: settings.level,
        generations: [...settings.generations],
        formGroups: [...settings.formGroups],
        questionTypes: [...settings.questionTypes],
      }
    : undefined;
};
