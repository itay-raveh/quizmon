import type { SimilarityWeights } from '../questions/family-rules.ts';
import type { Level } from '../level.ts';
import type { QuestionRendering, RenderingRole } from '../rendering.ts';

export const frontSprite = {
  reveal: 'always',
  silhouette: false,
} as const;
export const itemSprite = { reveal: 'always', silhouette: false } as const;
export const answerSprite = { ...frontSprite, reveal: 'after-answer' } as const;

/** Visibility defaults applied before family and level rendering overrides. */
export const baseQuestionRendering: QuestionRendering = {
  subject: {
    sprite: null,
    name: 'always',
    number: 'always',
    types: 'never',
  },
  choices: {
    sprite: frontSprite,
    name: 'always',
    number: 'always',
    types: 'never',
  },
  related: {
    sprite: null,
    name: 'always',
    number: 'always',
    types: 'never',
  },
  search: {
    sprite: frontSprite,
    name: 'always',
    number: 'always',
    types: 'never',
  },
};

export const responsePresets = {
  single: { kind: 'picker', selection: 'single', minimumOptions: 4 },
  shortSingle: { kind: 'picker', selection: 'single', minimumOptions: 2 },
  multi: { kind: 'picker', selection: 'multi', minimumOptions: 4 },
  shortMulti: { kind: 'picker', selection: 'multi', minimumOptions: 2 },
  adaptive: { kind: 'picker', selection: 'adaptive', minimumOptions: 4 },
} as const;

export const sampledMultiCorrectCounts = [
  1, 2, 3, 4,
] as const satisfies readonly (1 | 2 | 3 | 4)[];

export const sampledMultiCorrectWeights = {
  1: 15,
  2: 35,
  3: 35,
  4: 15,
} as const;

/** Shared sprite difficulty applies independently of generation/response-level inheritance. */
const pokemonSpriteDifficulty = {
  1: { historicalSpriteChance: 0, backSpriteChance: 0 },
  2: { historicalSpriteChance: 0.1, backSpriteChance: 0 },
  3: { historicalSpriteChance: 0.2, backSpriteChance: 0.1 },
  4: { historicalSpriteChance: 0.35, backSpriteChance: 0.2 },
  5: { historicalSpriteChance: 0.5, backSpriteChance: 0.3 },
} satisfies Record<
  Level,
  { historicalSpriteChance: number; backSpriteChance: number }
>;

export const applyPokemonSpriteDifficulty = (
  rendering: QuestionRendering,
  roles: readonly RenderingRole[] = [],
  level: Level,
  backRoles: readonly RenderingRole[] = [],
): QuestionRendering => {
  for (const role of roles) {
    const sprite = rendering[role].sprite;
    if (sprite)
      rendering[role].sprite = {
        historicalSpriteChance:
          pokemonSpriteDifficulty[level].historicalSpriteChance,
        ...sprite,
      };
  }
  for (const role of backRoles) {
    const sprite = rendering[role].sprite;
    if (sprite)
      rendering[role].sprite = {
        backSpriteChance: pokemonSpriteDifficulty[level].backSpriteChance,
        ...sprite,
      };
  }
  return rendering;
};

/** Relative ranking budgets, not probabilities. Families may spread and override these. */
export const pokemonSimilarityWeights = {
  type: 60,
  shape: 20,
  color: 12.5,
  evolutionStage: 7.5,
  proportions: 0,
  height: 0,
} satisfies SimilarityWeights;
export const typeSimilarityWeights = {
  type: 80,
  shape: 5,
  color: 5,
  evolutionStage: 10,
} satisfies Partial<SimilarityWeights>;
export const spriteSimilarityWeights = {
  type: 25,
  shape: 25,
  color: 35,
  evolutionStage: 5,
  proportions: 10,
} satisfies Partial<SimilarityWeights>;
export const silhouetteSimilarityWeights = {
  type: 30,
  shape: 35,
  color: 0,
  evolutionStage: 15,
  proportions: 20,
} satisfies Partial<SimilarityWeights> & { color: 0 };
export const pixelSimilarityWeights = {
  type: 20,
  shape: 15,
  color: 60,
  evolutionStage: 5,
} satisfies Partial<SimilarityWeights>;

/** Flat defaults for optional authored controls; each level still supplies required family facts. */
export const questionRuleDefaults = {
  allowEvolutionRelatives: true,
  distractorRankDirection: 'most-similar',
  distractorPoolSize: 15,
  smallPoolSimilarityRatio: 0.6,
  distantSpeciesFraction: 1 / 3,
  smallPoolPolicy: 'semantic-band',
  minimumEffectSimilarity: 0,
  maximumEffectSimilarity: 0.35,
  preferSimilarEffects: true,
  useFullEffectText: false,
  allowMissingSprites: false,
  sameItemCategory: false,
  singleType: false,
  encounterConditions: false,
  closeAlternatives: false,
  sameColorOrShape: false,
} as const;
