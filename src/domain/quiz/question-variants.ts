import {
  baseQuestionRendering,
  questionRules,
  type QuestionRuleEntry,
  type QuestionRuleRow,
} from '../../question-rules.ts';
import {
  mergeRendering,
  type QuestionRendering,
} from './question-rendering.ts';
import { resolveDifficultyVariant, type Difficulty } from './difficulty.ts';
import type { QuestionData } from './types.ts';
import type { FamilyRules } from './questions/family-rules.ts';

export { baseQuestionRendering } from '../../question-rules.ts';

const withRendering = <
  Type extends keyof FamilyRules,
  Rules extends { rendering: QuestionRendering; response: { kind: string } },
>(
  row: QuestionRuleRow<Rules, Type>,
  entry: QuestionRuleEntry<Rules, Type>,
): Rules =>
  ({
    ...entry,
    rendering: mergeRendering(
      mergeRendering(baseQuestionRendering, row.rendering),
      entry.rendering,
    ),
  }) as unknown as Rules;

/**
 * Resolve a family's separate no-difficulty entry, including rendering.
 * Returns `undefined` when the family has no unleveled entry.
 */
export const getUnleveledQuestionRule = <Type extends keyof FamilyRules>(
  type: Type,
): FamilyRules[Type] | undefined => {
  const row = questionRules[type] as QuestionRuleRow<FamilyRules[Type], Type>;
  return row.unleveled ? withRendering(row, row.unleveled) : undefined;
};

/**
 * Resolve the highest family level at or below `difficulty` and merge its
 * rendering. The returned `level` is the selected rule's level.
 */
export const getQuestionVariant = <Type extends keyof FamilyRules>(
  type: Type,
  difficulty: Difficulty,
):
  | {
      level: Difficulty;
      variant: FamilyRules[Type];
    }
  | undefined => {
  const row = questionRules[type] as QuestionRuleRow<FamilyRules[Type], Type>;
  const resolved = resolveDifficultyVariant(row.levels, difficulty);
  return resolved
    ? { level: resolved.level, variant: withRendering(row, resolved.variant) }
    : undefined;
};

/**
 * Resolve base, family, then selected-entry rendering. If no level matches,
 * use the unleveled entry when present, otherwise the base policy.
 */
export const resolveQuestionRendering = (
  type: QuestionData['questionType'],
  level?: Difficulty,
): QuestionRendering =>
  (level ? getQuestionVariant(type, level)?.variant.rendering : undefined) ??
  getUnleveledQuestionRule(type)?.rendering ??
  baseQuestionRendering;

/** Use a question's saved rendering or resolve its current family policy. */
export const getQuestionRendering = (
  question: QuestionData,
): QuestionRendering =>
  question.rendering ??
  resolveQuestionRendering(question.questionType, question.variantLevel);
