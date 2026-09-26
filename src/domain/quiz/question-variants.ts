import { questionRules } from '../../question-rules.ts';
import {
  mergeRendering,
  type QuestionRendering,
} from './question-rendering.ts';
import {
  resolveDifficultyVariant,
  type Difficulty,
  type DifficultyVariants,
} from './difficulty.ts';
import type { QuestionData } from './types.ts';
import type { FamilyRules } from './questions/family-rules.ts';

// Older saved questions may not contain a rendering snapshot.
export const defaultQuestionRendering: QuestionRendering = {
  subject: { sprite: 'always', name: 'always', number: 'always' },
  choices: { sprite: 'always', name: 'always', number: 'always' },
  related: { sprite: 'always', name: 'always', number: 'always' },
  search: { sprite: 'always', name: 'always', number: 'always' },
};

export const getStandardQuestionRule = <Type extends keyof FamilyRules>(
  type: Type,
): FamilyRules[Type] | undefined =>
  (questionRules[type] as { standard?: FamilyRules[Type] }).standard;

export const getQuestionVariant = <Type extends keyof FamilyRules>(
  type: Type,
  difficulty: Difficulty,
):
  | {
      level: Difficulty;
      variant: FamilyRules[Type];
    }
  | undefined => {
  const row = questionRules[type].levels as DifficultyVariants<
    FamilyRules[Type]
  >;
  return resolveDifficultyVariant(row, difficulty);
};

export const resolveQuestionRendering = (
  type: QuestionData['questionType'],
  level?: Difficulty,
): QuestionRendering =>
  type === 'archived'
    ? defaultQuestionRendering
    : ((level
        ? getQuestionVariant(type, level)?.variant.rendering
        : undefined) ??
      getStandardQuestionRule(type)?.rendering ??
      defaultQuestionRendering);

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
