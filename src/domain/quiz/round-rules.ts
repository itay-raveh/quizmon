import type { GameSettings } from '../settings/types.ts';
import type { QuestionData } from './types.ts';
import {
  isNonemptyChoiceArray,
  isRecord,
  isSafeNonnegativeInteger,
} from '../../lib/validation.ts';
import { formGroups, generations } from '../pokemon/types.ts';
import { difficultySchema } from './difficulty.ts';
import { questionTypes } from './questions/definitions.ts';
import { type GameResult, type RoundRules } from './types.ts';

export const isRoundRules = (value: unknown): value is RoundRules =>
  isRecord(value) &&
  isSafeNonnegativeInteger(value.version) &&
  difficultySchema.safeParse(value.difficulty).success &&
  (value.automaticQuestionTypes === undefined ||
    isNonemptyChoiceArray(value.automaticQuestionTypes, questionTypes)) &&
  isNonemptyChoiceArray(value.generations, generations) &&
  isNonemptyChoiceArray(value.formGroups, formGroups) &&
  isNonemptyChoiceArray(value.questionTypes, questionTypes);

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
