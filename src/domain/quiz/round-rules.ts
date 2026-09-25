import { z } from 'zod';
import type { GameSettings } from '../settings/types.ts';
import type { QuestionData } from './types.ts';
import { formGroups, generations } from '../pokemon/types.ts';
import { difficultySchema } from './difficulty.ts';
import { questionTypes } from './questions/definitions.ts';
import { type GameResult } from './types.ts';

const roundRulesSchema = z.object({
  automaticQuestionTypes: z.array(z.enum(questionTypes)).min(1).optional(),
  version: z.int().min(0),
  difficulty: difficultySchema,
  generations: z.array(z.enum(generations)).min(1),
  formGroups: z.array(z.enum(formGroups)).min(1),
  questionTypes: z.array(z.enum(questionTypes)).min(1),
});

export const savedRoundRulesSchema = roundRulesSchema.extend({
  automaticQuestionTypes: z.array(z.string().min(1).max(200)).min(1).optional(),
  questionTypes: z.array(z.string().min(1).max(200)).min(1),
});

export type RoundRules = z.infer<typeof savedRoundRulesSchema>;

export const getRulesScoreKey = (
  result: Pick<GameResult, 'contentVersion' | 'scoreVersion' | 'rules'>,
): `rules:${string}` | undefined => {
  const rules = result.rules;
  if (!rules) return undefined;
  const ordered = (values: readonly string[]) => [...new Set(values)].sort();
  return `rules:${JSON.stringify([
    rules.version,
    result.contentVersion,
    result.scoreVersion ?? 0,
    rules.difficulty,
    ordered(rules.generations),
    ordered(rules.formGroups),
    ordered(rules.questionTypes),
  ])}`;
};

export const snapshotRoundRules = (
  settings: GameSettings,
  questions: QuestionData[],
): RoundRules | undefined => {
  const version = questions[0]?.rulesVersion;
  return settings.difficulty && version
    ? {
        ...(settings.automaticQuestionTypes
          ? { automaticQuestionTypes: [...settings.automaticQuestionTypes] }
          : {}),
        version,
        difficulty: settings.difficulty,
        generations: [...settings.generations],
        formGroups: [...settings.formGroups],
        questionTypes: [...settings.questionTypes],
      }
    : undefined;
};
