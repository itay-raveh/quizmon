import { questionRules } from './question-rules/registry.ts';
import { baseQuestionRendering } from './question-rules/shared.ts';
import type {
  QuestionRuleEntry,
  QuestionRuleRow,
} from './question-rules/types.ts';
import { mergeRendering, type QuestionRendering } from './rendering.ts';
import { resolveLevelVariant, type Level } from './level.ts';
import type { QuestionData } from './types.ts';
import type { FamilyRules } from './questions/family-rules.ts';
import type { QuestionType } from './questions/definitions.ts';

export { baseQuestionRendering } from './question-rules/shared.ts';

export const isActiveQuestionType = (type: QuestionType): boolean =>
  !('active' in questionRules[type] && questionRules[type].active === false);

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
 * Resolve the highest available family level at or below `level` and
 * merge its rendering. The returned `level` is the selected rule's level.
 */
export const getQuestionVariant = <Type extends keyof FamilyRules>(
  type: Type,
  level: Level,
):
  | {
      level: Level;
      variant: FamilyRules[Type];
    }
  | undefined => {
  const row = questionRules[type] as QuestionRuleRow<FamilyRules[Type], Type>;
  const resolved = resolveLevelVariant(row.levels, level);
  return resolved
    ? { level: resolved.level, variant: withRendering(row, resolved.variant) }
    : undefined;
};

/**
 * Resolve base, family, then selected-entry rendering. Saved questions without
 * a level retain their family visibility when no snapshot is available.
 */
const resolveQuestionRendering = (
  type: QuestionData['questionType'],
  level?: Level,
): QuestionRendering =>
  (level ? getQuestionVariant(type, level)?.variant.rendering : undefined) ??
  mergeRendering(baseQuestionRendering, questionRules[type].rendering);

/** Use a question's saved rendering or resolve its current family policy. */
export const getQuestionRendering = (
  question: QuestionData,
): QuestionRendering =>
  question.rendering ??
  resolveQuestionRendering(question.questionType, question.variantLevel);
