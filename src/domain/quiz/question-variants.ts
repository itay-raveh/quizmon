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
  Rules extends { rendering: QuestionRendering },
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
  }) as Rules;

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

/**
 * Use a question's saved rendering snapshot when present. Questions without
 * one derive a policy from current rules and their own concealment metadata.
 */
export const getQuestionRendering = (
  question: QuestionData,
): QuestionRendering => {
  if (question.rendering) return question.rendering;
  let fallback = resolveQuestionRendering(
    question.questionType,
    question.variantLevel,
  );
  if (
    question.media.kind === 'sprite' &&
    (question.media.silhouette !== undefined ||
      question.media.revealAt !== undefined)
  ) {
    const { revealAt, silhouette } = question.media;
    fallback = mergeRendering(fallback, {
      subject: {
        sprite:
          revealAt === undefined
            ? silhouette
              ? 'silhouette'
              : 'always'
            : { afterClues: revealAt, silhouette },
      },
    });
  }
  if (
    question.concealOptionLabels &&
    question.questionType !== 'legendary-mythical-selection'
  )
    return mergeRendering(fallback, {
      choices: {
        name: 'after-answer',
        number: 'after-answer',
        ...(Object.values(question.optionVisuals ?? {}).some(
          (visual) => visual.silhouette,
        )
          ? { sprite: 'silhouette' }
          : {}),
      },
    });
  return fallback;
};
