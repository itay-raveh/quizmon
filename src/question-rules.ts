import type { DifficultyVariants } from './domain/quiz/difficulty.ts';
import type { VariantRules } from './domain/quiz/question-variants.ts';
import type { RenderingOverrides } from './domain/quiz/question-rendering.ts';
import type { QuestionType } from './domain/quiz/questions/definitions.ts';

// Shared ranking defaults. Per-family distractorPoolSize overrides the shortlist.
export const questionTuning = {
  distractorPoolSize: 15,
  smallPoolSimilarityRatio: 0.6,
  distantSpeciesFraction: 1 / 3,
  sameEncounterMethodWeight: 100,
  frontSpriteChance: 0.75,
  maximumEffectSimilarity: 0.35,
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

export const questionVariants = {
  'item-identification': {
    1: { distinctItemCategories: true },
    2: { sameItemPocket: true },
    3: { sameItemCategory: true },
    5: { sameItemCategory: true, machineDiscChance: 0.5 },
  },
  'medicine-cabinet': {
    2: {
      minimumEffectSimilarity: 0,
      maximumEffectSimilarity: 0.35,
      preferSimilarEffects: false,
    },
    3: {
      sameItemCategory: true,
      minimumEffectSimilarity: 0,
      maximumEffectSimilarity: 0.8,
      preferSimilarEffects: false,
    },
    4: {
      sameItemCategory: true,
      minimumEffectSimilarity: 0.3,
      maximumEffectSimilarity: 0.8,
      preferSimilarEffects: true,
    },
    5: {
      sameItemCategory: true,
      minimumEffectSimilarity: 0.5,
      maximumEffectSimilarity: 0.8,
      preferSimilarEffects: true,
      useFullEffectText: true,
      allowMissingSprites: true,
    },
  },
  'weight-comparison': {
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
        minimumRatio: 1.3,
        maximumRatio: 2,
        maximumSpread: 2,
      },
    },
    5: {
      measurement: {
        minimumRatio: 1.3,
        maximumRatio: 1.5,
        maximumSpread: 1.5,
      },
    },
  },
  'height-comparison': {
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
        minimumRatio: 1.3,
        maximumRatio: 2,
        maximumSpread: 2,
      },
    },
    5: {
      measurement: {
        minimumRatio: 1.3,
        maximumRatio: 1.5,
        maximumSpread: 1.5,
      },
    },
  },
  'move-types': {
    2: { showMoveDescription: true },
    3: { allOptions: true, excludeTypeHintNames: true },
  },
  'name-that-region': { 2: {}, 3: { allOptions: true } },
  'move-purpose': {
    2: { statusMovesOnly: true },
    3: { statusMovesOnly: false },
    4: { statusMovesOnly: false, sameMoveType: true },
  },
  'pokedex-categories': {
    2: {},
    3: { sameColorOrShape: true },
    4: { sameColorOrShape: true },
    5: { sameColorOrShape: true, closeAlternatives: true },
  },
  'evolution-conditions': {
    3: { minimumEvolutionConditions: 1, maximumEvolutionConditions: 1 },
    4: { minimumEvolutionConditions: 2 },
    5: { minimumEvolutionConditions: 2, preferCloseConditionValues: true },
  },
  'ability-effects': {
    3: {
      minimumEffectSimilarity: 0,
      maximumEffectSimilarity: 0.35,
      preferSimilarEffects: false,
    },
    4: {
      minimumEffectSimilarity: 0,
      maximumEffectSimilarity: 0.35,
      preferSimilarEffects: true,
    },
    5: {
      minimumEffectSimilarity: 0,
      maximumEffectSimilarity: 0.35,
      preferSimilarEffects: true,
      useFullEffectText: true,
      allowMissingSprites: true,
    },
  },
  'held-item-effects': {
    3: {
      sameItemCategory: true,
      minimumEffectSimilarity: 0,
      maximumEffectSimilarity: 0.8,
      preferSimilarEffects: false,
    },
    4: {
      sameItemCategory: true,
      minimumEffectSimilarity: 0.3,
      maximumEffectSimilarity: 0.8,
      preferSimilarEffects: true,
    },
    5: {
      sameItemCategory: true,
      minimumEffectSimilarity: 0.5,
      maximumEffectSimilarity: 0.8,
      preferSimilarEffects: true,
      useFullEffectText: true,
      allowMissingSprites: true,
    },
  },
  'hidden-abilities': {
    4: { sameTypeAbilityDistractors: false },
    5: { sameTypeAbilityDistractors: true, allowMissingSprites: true },
  },
  'nature-effects': {
    4: { shareNatureStat: false },
    5: { shareNatureStat: true },
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
    5: { completeFlavors: true, allOptions: true },
  },
  'natural-gift': { 5: { allOptions: true } },
  'pokedex-scan': {
    rendering: {
      subject: { name: 'never', number: 'never' },
      choices: { sprite: 'never' },
      search: { sprite: 'never' },
    },
    1: { currentSpriteChance: 1, distractorRankDirection: -1 },
    2: { currentSpriteChance: 1, distractorRankDirection: 1 },
    4: { distractorRankDirection: 1, distractorPoolSize: 6 },
    5: { search: true, backSpriteChance: 1 },
  },
  'sprite-match': {
    rendering: {
      subject: { sprite: 'never' },
      choices: { name: 'after-answer', number: 'after-answer' },
    },
    1: { distractorRankDirection: -1 },
    3: { distractorRankDirection: 1 },
    4: { distractorRankDirection: 1, distractorPoolSize: 6 },
    5: { distractorRankDirection: 1, distractorPoolSize: 3 },
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
    2: { distractorRankDirection: -1 },
    4: { distractorRankDirection: 1, distractorPoolSize: 6 },
    5: { distractorRankDirection: 1, distractorPoolSize: 3 },
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
    2: { distractorRankDirection: -1 },
    3: { distractorRankDirection: 1 },
    5: { search: true },
  },
  'pixel-peek': {
    rendering: {
      subject: { name: 'never', number: 'never' },
      choices: { sprite: 'never' },
      search: { sprite: 'never' },
    },
    3: { cropScale: 0.65 },
    4: { distractorRankDirection: 1, distractorPoolSize: 6 },
    5: { search: true, cropScale: 1.4 },
  },
  'shiny-spotter': {
    3: {},
    4: { distractorRankDirection: 1, distractorPoolSize: 6 },
    5: { distractorRankDirection: 1, distractorPoolSize: 3 },
  },
  'field-notes': {
    2: {},
    3: {},
    4: { search: true },
  },
  'type-check': {
    2: { singleType: true },
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
    5: {
      rendering: {
        subject: { types: 'after-answer' },
        related: { types: 'after-answer' },
      },
    },
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
    3: {
      showTypes: true,
      multipliers: [2, 4],
      rendering: { subject: { types: 'after-answer' } },
    },
    4: { multipliers: [0.25, 0.5, 2, 4] },
    5: {
      distractorRankDirection: 1,
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
} satisfies {
  [Type in QuestionType | 'champion']: DifficultyVariants<
    FamilyRules[Type] & Pick<VariantRules, 'enabled' | 'rendering'>
  > & { rendering?: RenderingOverrides };
};

type PokemonDistractors = Pick<
  VariantRules,
  | 'distractorRankDirection'
  | 'distractorPoolSize'
  | 'smallPoolSimilarityRatio'
  | 'distantSpeciesFraction'
  | 'similarityWeights'
>;
type EffectDistractors = Pick<
  VariantRules,
  | 'minimumEffectSimilarity'
  | 'maximumEffectSimilarity'
  | 'preferSimilarEffects'
  | 'useFullEffectText'
>;
type NoControls = {
  [Key in Exclude<keyof VariantRules, 'enabled' | 'rendering'>]?: never;
};
type FamilyRules = {
  'item-identification': Pick<
    VariantRules,
    | 'distinctItemCategories'
    | 'sameItemPocket'
    | 'sameItemCategory'
    | 'machineDiscChance'
  >;
  'medicine-cabinet': EffectDistractors &
    Pick<VariantRules, 'sameItemCategory' | 'allowMissingSprites'>;
  'weight-comparison': Pick<VariantRules, 'measurement'>;
  'height-comparison': Pick<VariantRules, 'measurement'>;
  'move-types': Pick<
    VariantRules,
    'showMoveDescription' | 'allOptions' | 'excludeTypeHintNames'
  >;
  'name-that-region': Pick<VariantRules, 'allOptions'>;
  'move-purpose': Pick<VariantRules, 'statusMovesOnly' | 'sameMoveType'>;
  'pokedex-categories': Pick<
    VariantRules,
    'sameColorOrShape' | 'closeAlternatives' | 'similarityWeights'
  >;
  'evolution-conditions': Pick<
    VariantRules,
    | 'minimumEvolutionConditions'
    | 'maximumEvolutionConditions'
    | 'preferCloseConditionValues'
  >;
  'ability-effects': EffectDistractors &
    Pick<VariantRules, 'allowMissingSprites'>;
  'held-item-effects': EffectDistractors &
    Pick<VariantRules, 'sameItemCategory' | 'allowMissingSprites'>;
  'hidden-abilities': Pick<
    VariantRules,
    'sameTypeAbilityDistractors' | 'allowMissingSprites'
  >;
  'nature-effects': Pick<VariantRules, 'shareNatureStat'>;
  'ev-yields': Pick<VariantRules, 'completeEvYield' | 'closeAlternatives'>;
  'encounter-locations': Pick<
    VariantRules,
    'encounterConditions' | 'closeAlternatives' | 'similarityWeights'
  >;
  'berry-flavors': Pick<VariantRules, 'completeFlavors' | 'allOptions'>;
  'natural-gift': Pick<VariantRules, 'allOptions'>;
  'pokedex-scan': PokemonDistractors &
    Pick<
      VariantRules,
      | 'currentSpriteChance'
      | 'backSpriteChance'
      | 'frontSpriteChance'
      | 'search'
    >;
  'sprite-match': PokemonDistractors;
  'silhouette-match': PokemonDistractors;
  'whos-that-pokemon': PokemonDistractors & Pick<VariantRules, 'search'>;
  'pixel-peek': PokemonDistractors & Pick<VariantRules, 'search' | 'cropScale'>;
  'shiny-spotter': PokemonDistractors;
  'field-notes': Pick<VariantRules, 'search'>;
  'type-check': Pick<VariantRules, 'singleType' | 'typeGrid'>;
  'odd-one-out': Pick<VariantRules, 'singleType'>;
  'type-roundup': Pick<VariantRules, 'singleType'>;
  'type-twins': NoControls;
  'legend-hunt': NoControls;
  'generation-roundup': NoControls;
  'evolution-link': Pick<VariantRules, 'search'>;
  'evolution-shift': NoControls;
  'ability-check': Pick<VariantRules, 'plausibleProperties'>;
  'move-check': Pick<VariantRules, 'plausibleProperties'>;
  'stat-showdown': Pick<VariantRules, 'statGap'>;
  'type-matchup': Pick<
    VariantRules,
    'singleType' | 'showTypes' | 'multipliers' | 'typeGrid'
  >;
  'counter-pick': PokemonDistractors &
    Pick<VariantRules, 'singleType' | 'showTypes' | 'multipliers'>;
  champion: Pick<VariantRules, 'finale'>;
};
