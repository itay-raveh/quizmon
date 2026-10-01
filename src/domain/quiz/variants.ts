import { questionRules } from './question-rules/registry.ts';
import { baseQuestionRendering } from './question-rules/shared.ts';
import type {
  QuestionRuleEntry,
  QuestionRuleRow,
} from './question-rules/types.ts';
import { mergeRendering, type QuestionRendering } from './rendering.ts';
import { resolveDifficultyVariant, type Difficulty } from './difficulty.ts';
import type { QuestionData } from './types.ts';
import type { FamilyRules } from './questions/family-rules.ts';

export { baseQuestionRendering } from './question-rules/shared.ts';

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
 * Resolve the highest available family level at or below `difficulty` and
 * merge its rendering. The returned `level` is the selected rule's level.
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
 * Resolve base, family, then selected-entry rendering. Saved questions without
 * a level retain their family visibility when no snapshot is available.
 */
export const resolveQuestionRendering = (
  type: QuestionData['questionType'],
  level?: Difficulty,
): QuestionRendering =>
  (level ? getQuestionVariant(type, level)?.variant.rendering : undefined) ??
  mergeRendering(baseQuestionRendering, questionRules[type].rendering);

/** Use a question's saved rendering or resolve its current family policy. */
export const getQuestionRendering = (
  question: QuestionData,
): QuestionRendering =>
  question.rendering ??
  resolveQuestionRendering(question.questionType, question.variantLevel);
