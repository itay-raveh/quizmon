import {
  mergeRendering,
  type QuestionRendering,
  type RenderingOverrides,
} from './question-rendering';
import {
  resolveDifficultyVariant,
  type Difficulty,
  type DifficultyVariants,
} from './difficulty';
import type { QuestionData } from './types';
import type { MeasurementRules } from './measurement-comparison';

// Bump when changing any executable variant rule. Saved lineups retain their rules.
export const QUESTION_RULES_VERSION = 7;

// Shared ranking defaults. Per-family distractorPoolSize overrides the shortlist.
export const questionTuning = {
  distractorPoolSize: 15,
  smallPoolSimilarityRatio: 0.6,
  distantSpeciesFraction: 1 / 3,
  sameEncounterMethodWeight: 100,
  similarity: {
    sharedType: 12,
    shape: 8,
    color: 5,
    generation: 4,
    evolutionStage: 3,
    statMaximum: 3,
    statScale: 80,
  },
};

export interface VariantRules extends ExpansionVariantRules {
  distractors?: 'dissimilar' | 'similar';
  distractorPoolSize?: number;
  search?: boolean;
  singleType?: boolean;
  showTypes?: boolean;
  typeGrid?: boolean;
  currentSprite?: boolean;
  preferBackSprite?: boolean;
  cropScale?: number;
  plausibleProperties?: boolean;
  statGap?: readonly [number, number];
  multipliers?: readonly number[];
  finale?: {
    opening: 'choices-types' | 'choices' | 'search';
    assistance: boolean;
    penalty: number;
  };
}

export interface ExpansionVariantRules {
  rendering?: RenderingOverrides;
  allowMissingSprites?: boolean;
  closeAlternatives?: boolean;
  itemChoices?:
    | 'different-categories'
    | 'pocket'
    | 'category'
    | 'medicines'
    | 'stones'
    | 'direct-use';
  combinedCure?: boolean;
  measurement?: MeasurementRules;
  reviewedDescription?: boolean;
  fullList?: 'types' | 'regions';
  damageClass?: 'status' | 'any';
  sameMoveType?: boolean;
  sameColorOrShape?: boolean;
  evolutionConditions?: 'simple' | 'combined' | 'one-condition';
  effectChoices?: 'broad' | 'related' | 'exact';
  hiddenAbility?: 'ordinary' | 'similar';
  natureChoices?: 'different-raised' | 'shared-stat';
  showEggGroups?: boolean;
  completeEvYield?: boolean;
  encounterConditions?: boolean;
  completeFlavors?: boolean;
}

export const expansionVariants = {
  'item-identification': {
    1: { itemChoices: 'different-categories' },
    2: { itemChoices: 'pocket' },
    3: { itemChoices: 'category' },
  },
  'medicine-cabinet': {
    1: { itemChoices: 'different-categories' },
    2: { itemChoices: 'medicines' },
    3: { itemChoices: 'medicines', allowMissingSprites: true },
    4: {
      itemChoices: 'medicines',
      allowMissingSprites: true,
      combinedCure: true,
    },
  },
  'evolution-items': {
    1: { itemChoices: 'different-categories' },
    2: { itemChoices: 'stones' },
    3: { itemChoices: 'direct-use' },
    4: { itemChoices: 'direct-use', allowMissingSprites: true },
  },
  'weight-comparison': {
    1: {
      measurement: {
        minimumRatio: 4,
        maximumRatio: Infinity,
        maximumSpread: Infinity,
      },
    },
    2: {
      measurement: {
        minimumRatio: 2,
        maximumRatio: Infinity,
        maximumSpread: Infinity,
      },
    },
    3: {
      measurement: {
        minimumRatio: 1.3,
        maximumRatio: Infinity,
        maximumSpread: Infinity,
      },
    },
    4: {
      measurement: {
        minimumRatio: 1.08,
        maximumRatio: 1.3,
        maximumSpread: 1.5,
      },
    },
    5: {
      measurement: {
        minimumRatio: 1.001,
        maximumRatio: 1.08,
        maximumSpread: 1.2,
      },
    },
  },
  'height-comparison': {
    1: {
      measurement: {
        minimumRatio: 4,
        maximumRatio: Infinity,
        maximumSpread: Infinity,
      },
    },
    2: {
      measurement: {
        minimumRatio: 2,
        maximumRatio: Infinity,
        maximumSpread: Infinity,
      },
    },
    3: {
      measurement: {
        minimumRatio: 1.3,
        maximumRatio: Infinity,
        maximumSpread: Infinity,
      },
    },
    4: {
      measurement: {
        minimumRatio: 1.08,
        maximumRatio: 1.3,
        maximumSpread: 1.5,
      },
    },
    5: {
      measurement: {
        minimumRatio: 1.001,
        maximumRatio: 1.08,
        maximumSpread: 1.2,
      },
    },
  },
  'move-types': {
    1: { reviewedDescription: true },
    2: {},
    3: { fullList: 'types' },
  },
  'name-that-region': { 2: {}, 3: { fullList: 'regions' } },
  'move-purpose': {
    2: { damageClass: 'status' },
    3: { damageClass: 'any' },
    4: { damageClass: 'any', sameMoveType: true },
  },
  'pokedex-categories': {
    2: {},
    3: { sameColorOrShape: true },
    4: { sameColorOrShape: true },
    5: { sameColorOrShape: true, closeAlternatives: true },
  },
  'evolution-conditions': {
    3: { evolutionConditions: 'simple' },
    4: { evolutionConditions: 'combined' },
    5: { evolutionConditions: 'one-condition' },
  },
  'ability-effects': {
    3: { effectChoices: 'broad' },
    4: { effectChoices: 'related' },
    5: { effectChoices: 'exact', allowMissingSprites: true },
  },
  'held-item-effects': {
    3: { effectChoices: 'broad' },
    4: { effectChoices: 'related' },
    5: { effectChoices: 'exact', allowMissingSprites: true },
  },
  'hidden-abilities': {
    4: { hiddenAbility: 'ordinary' },
    5: { hiddenAbility: 'similar', allowMissingSprites: true },
  },
  'nature-effects': {
    4: { natureChoices: 'different-raised' },
    5: { natureChoices: 'shared-stat' },
  },
  'egg-group-connections': {
    4: { showEggGroups: true },
    5: { showEggGroups: false, closeAlternatives: true },
  },
  'ev-yields': {
    4: { completeEvYield: false },
    5: { completeEvYield: true, closeAlternatives: true },
  },
  'encounter-locations': {
    4: {},
    5: { encounterConditions: true, closeAlternatives: true },
  },
  'berry-flavors': {
    4: { completeFlavors: false },
    5: { completeFlavors: true, closeAlternatives: true },
  },
  'natural-gift': { 5: { fullList: 'types' } },
} satisfies Record<
  string,
  DifficultyVariants<ExpansionVariantRules> & { rendering?: RenderingOverrides }
>;

export type ExpansionQuestionType = keyof typeof expansionVariants;

// Family rendering is the baseline; each checkpoint overrides individual fields.
// Generated questions keep a snapshot so later grid edits do not change saved rounds.
export const defaultQuestionRendering: QuestionRendering = {
  subject: { sprite: 'always', name: 'always', number: 'always' },
  choices: { sprite: 'always', name: 'always', number: 'always' },
  related: { sprite: 'always', name: 'always', number: 'always' },
  search: { sprite: 'always', name: 'always', number: 'always' },
};

export const questionVariants: Record<
  QuestionData['questionType'] | ExpansionQuestionType,
  DifficultyVariants<VariantRules> & { rendering?: RenderingOverrides }
> = {
  ...expansionVariants,
  'pokedex-scan': {
    rendering: {
      subject: { name: 'never', number: 'never' },
      choices: { sprite: 'never' },
      search: { sprite: 'never' },
    },
    1: { currentSprite: true, distractors: 'dissimilar' },
    2: { currentSprite: true, distractors: 'similar' },
    4: { distractors: 'similar', distractorPoolSize: 6 },
    5: { search: true, preferBackSprite: true },
  },
  'sprite-match': {
    rendering: {
      subject: { sprite: 'never' },
      choices: { name: 'after-answer', number: 'after-answer' },
    },
    1: { distractors: 'dissimilar' },
    3: { distractors: 'similar' },
    4: { distractors: 'similar', distractorPoolSize: 6 },
    5: { distractors: 'similar', distractorPoolSize: 3 },
  },
  'silhouette-match': {
    rendering: {
      subject: { sprite: 'never' },
      choices: {
        sprite: 'silhouette',
        name: 'after-answer',
        number: 'after-answer',
      },
    },
    2: { distractors: 'dissimilar' },
    4: { distractors: 'similar', distractorPoolSize: 6 },
    5: { distractors: 'similar', distractorPoolSize: 3 },
  },
  'whos-that-pokemon': {
    rendering: {
      subject: {
        sprite: 'silhouette',
        name: 'never',
        number: 'never',
      },
      choices: { sprite: 'never' },
      search: { sprite: 'never' },
    },
    2: { distractors: 'dissimilar' },
    3: { distractors: 'similar' },
    5: { search: true },
  },
  'pixel-peek': {
    rendering: {
      subject: { name: 'never', number: 'never' },
      choices: { sprite: 'never' },
      search: { sprite: 'never' },
    },
    3: { cropScale: 0.65 },
    4: { distractors: 'similar', distractorPoolSize: 6 },
    5: { search: true, cropScale: 1.4 },
  },
  'shiny-spotter': {
    3: {},
    4: { distractors: 'similar', distractorPoolSize: 6 },
    5: { distractors: 'similar', distractorPoolSize: 3 },
  },
  'field-notes': {
    2: {},
    3: {},
    4: { search: true },
  },
  'type-check': {
    1: { singleType: true },
    2: {},
    3: { typeGrid: true },
    4: { typeGrid: true },
  },
  'odd-one-out': { 2: { singleType: true }, 3: {} },
  'type-roundup': { 2: { singleType: true }, 3: {} },
  'type-twins': { 3: {}, 4: {} },
  'legend-hunt': { 2: {}, 4: {} },
  'generation-roundup': {
    rendering: { choices: { number: 'after-answer' } },
    2: {},
    4: {},
  },
  'evolution-link': {
    rendering: {
      subject: {
        sprite: 'after-answer',
        name: 'after-answer',
        number: 'after-answer',
      },
      choices: { sprite: 'never', number: 'never' },
      search: { sprite: 'never' },
    },
    2: {},
    4: { search: true },
  },
  'evolution-shift': {
    rendering: {
      related: {
        sprite: 'after-answer',
        name: 'after-answer',
        number: 'after-answer',
      },
    },
    3: {},
    4: {},
  },
  'ability-check': { 3: {}, 5: { plausibleProperties: true } },
  'move-check': { 4: {}, 5: { plausibleProperties: true } },
  'stat-showdown': {
    3: { statGap: [41, Infinity] },
    4: { statGap: [21, 40] },
    5: { statGap: [10, 20] },
  },
  'type-matchup': {
    1: { singleType: true, showTypes: true, multipliers: [2] },
    2: { singleType: true, multipliers: [2] },
    3: { showTypes: true, multipliers: [2, 4] },
    4: { multipliers: [0.25, 0.5, 2, 4] },
    5: {
      typeGrid: true,
      multipliers: [0, 0.25, 0.5, 1, 2, 4],
    },
  },
  'counter-pick': {
    rendering: {
      related: { sprite: 'after-answer', name: 'never', number: 'never' },
    },
    2: { singleType: true, showTypes: true, multipliers: [2] },
    3: { showTypes: true, multipliers: [2, 4] },
    4: { multipliers: [0.25, 0.5, 2, 4] },
    5: {
      distractors: 'similar',
      distractorPoolSize: 3,
      multipliers: [0.25, 0.5, 2, 4],
    },
  },
  champion: {
    rendering: {
      subject: {
        sprite: { afterClues: 4, silhouette: true },
        name: 'never',
        number: 'never',
      },
      choices: { sprite: 'never', number: 'after-answer' },
      search: { sprite: 'never', number: 'never' },
    },
    1: { finale: { opening: 'choices-types', assistance: false, penalty: 2 } },
    2: { finale: { opening: 'choices', assistance: false, penalty: 1 } },
    3: { finale: { opening: 'search', assistance: true, penalty: 0 } },
    4: { finale: { opening: 'search', assistance: true, penalty: 0 } },
    5: { finale: { opening: 'search', assistance: false, penalty: 0 } },
  },
};

export const getQuestionVariant = (
  type: QuestionData['questionType'],
  difficulty: Difficulty,
) => {
  const row = questionVariants[type];
  const resolved = resolveDifficultyVariant(row, difficulty);
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
  mergeRendering(defaultQuestionRendering, questionVariants[type].rendering);

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
