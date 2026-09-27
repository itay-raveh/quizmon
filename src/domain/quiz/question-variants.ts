import {
  questionRules,
  type QuestionRuleEntry,
  type QuestionRuleRow,
} from '../../question-rules.ts';
import {
  defaultQuestionRendering,
  mergeRendering,
  type QuestionRendering,
} from './question-rendering.ts';
import { resolveDifficultyVariant, type Difficulty } from './difficulty.ts';
import type { QuestionData } from './types.ts';
import type { FamilyRules } from './questions/family-rules.ts';

export { defaultQuestionRendering } from './question-rendering.ts';

const withRendering = <Rules extends { rendering: QuestionRendering }>(
  row: QuestionRuleRow<Rules>,
  entry: QuestionRuleEntry<Rules>,
): Rules =>
  ({
    ...entry,
    rendering: mergeRendering(row.rendering, entry.rendering),
  }) as Rules;

export const getUnleveledQuestionRule = <Type extends keyof FamilyRules>(
  type: Type,
): FamilyRules[Type] | undefined => {
  const row = questionRules[type] as QuestionRuleRow<FamilyRules[Type]>;
  return row.unleveled ? withRendering(row, row.unleveled) : undefined;
};

export const getQuestionVariant = <Type extends keyof FamilyRules>(
  type: Type,
  difficulty: Difficulty,
):
  | {
      level: Difficulty;
      variant: FamilyRules[Type];
    }
  | undefined => {
  const row = questionRules[type] as QuestionRuleRow<FamilyRules[Type]>;
  const resolved = resolveDifficultyVariant(row.levels, difficulty);
  return resolved
    ? { level: resolved.level, variant: withRendering(row, resolved.variant) }
    : undefined;
};

export const resolveQuestionRendering = (
  type: QuestionData['questionType'],
  level?: Difficulty,
): QuestionRendering =>
  (level ? getQuestionVariant(type, level)?.variant.rendering : undefined) ??
  getUnleveledQuestionRule(type)?.rendering ??
  defaultQuestionRendering;

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
  // Older saved questions can carry custom media and concealment outside the grid.
  if (question.concealOptionLabels && question.questionType !== 'legend-hunt')
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
