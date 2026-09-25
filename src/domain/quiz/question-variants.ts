import { questionVariants } from '../../question-rules.ts';
export { questionTuning } from '../../question-rules.ts';
import {
  mergeRendering,
  type QuestionRendering,
  type RenderingOverrides,
} from './question-rendering.ts';
import {
  resolveDifficultyVariant,
  type Difficulty,
  type DifficultyVariants,
} from './difficulty.ts';
import type { QuestionData } from './types.ts';
import type { MeasurementRules } from './measurement-comparison.ts';

export interface VariantRules {
  enabled?: boolean;
  distractorRankDirection?: 1 | -1;
  distractorPoolSize?: number;
  smallPoolSimilarityRatio?: number;
  distantSpeciesFraction?: number;
  similarityWeights?: Partial<{
    sharedType: number;
    shape: number;
    color: number;
    generation: number;
    evolutionStage: number;
    statMaximum: number;
    statScale: number;
  }>;
  search?: boolean;
  singleType?: boolean;
  showTypes?: boolean;
  typeGrid?: boolean;
  currentSpriteChance?: number;
  backSpriteChance?: number;
  frontSpriteChance?: number;
  cropScale?: number;
  plausibleProperties?: boolean;
  statGap?: readonly [number, number];
  multipliers?: readonly number[];
  finale?: {
    opening: 'choices-types' | 'choices' | 'search';
    assistance: boolean;
    penalty: number;
  };
  rendering?: RenderingOverrides;
  allowMissingSprites?: boolean;
  closeAlternatives?: boolean;
  distinctItemCategories?: boolean;
  sameItemPocket?: boolean;
  sameItemCategory?: boolean;
  stonesOnly?: boolean;
  directUseItemsOnly?: boolean;
  measurement?: MeasurementRules;
  showMoveDescription?: boolean;
  excludeTypeHintNames?: boolean;
  allOptions?: boolean;
  statusMovesOnly?: boolean;
  sameMoveType?: boolean;
  sameColorOrShape?: boolean;
  minimumEvolutionConditions?: number;
  maximumEvolutionConditions?: number;
  preferCloseConditionValues?: boolean;
  useFullEffectText?: boolean;
  minimumEffectSimilarity?: number;
  maximumEffectSimilarity?: number;
  preferSimilarEffects?: boolean;
  sameTypeAbilityDistractors?: boolean;
  shareNatureStat?: boolean;
  machineDiscChance?: number;
  completeEvYield?: boolean;
  encounterConditions?: boolean;
  completeFlavors?: boolean;
}

// Family rendering is the baseline; each level overrides individual fields.
// Generated questions keep a snapshot so later grid edits do not change saved rounds.
export const defaultQuestionRendering: QuestionRendering = {
  subject: { sprite: 'always', name: 'always', number: 'always' },
  choices: { sprite: 'always', name: 'always', number: 'always' },
  related: { sprite: 'always', name: 'always', number: 'always' },
  search: { sprite: 'always', name: 'always', number: 'always' },
};

export const getQuestionVariant = (
  type: QuestionData['questionType'],
  difficulty: Difficulty,
) => {
  const row: DifficultyVariants<VariantRules> & {
    rendering?: RenderingOverrides;
  } = questionVariants[type];
  const resolved = resolveDifficultyVariant(row, difficulty);
  if (resolved?.variant.enabled === false) return undefined;
  return (
    resolved && {
      ...resolved,
      variant: {
        ...resolved.variant,
        rendering: mergeRendering(
          mergeRendering(defaultQuestionRendering, row.rendering),
          resolved.variant.rendering,
        ),
      },
    }
  );
};

export const resolveQuestionRendering = (
  type: QuestionData['questionType'],
  level?: Difficulty,
): QuestionRendering =>
  (level ? getQuestionVariant(type, level)?.variant.rendering : undefined) ??
  mergeRendering(
    defaultQuestionRendering,
    (questionVariants[type] as { rendering?: RenderingOverrides }).rendering,
  );

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
