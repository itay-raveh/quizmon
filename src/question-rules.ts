import type { DifficultyRules } from './domain/quiz/difficulty.ts';
import {
  type EntityRendering,
  type QuestionRendering,
} from './domain/quiz/question-rendering.ts';
import type { FamilyRules } from './domain/quiz/questions/family-rules.ts';

type Renderable<Fields extends keyof EntityRendering> = Partial<
  Pick<EntityRendering, Fields>
>;
type HiddenUntilAnswer = 'after-answer' | 'never';

type RenderingControls<
  Subject extends keyof EntityRendering = never,
  Choices extends keyof EntityRendering = never,
  Related extends keyof EntityRendering = never,
  Search extends keyof EntityRendering = never,
> = {
  subject?: [Subject] extends [never] ? never : Renderable<Subject>;
  choices?: [Choices] extends [never] ? never : Renderable<Choices>;
  related?: [Related] extends [never] ? never : Renderable<Related>;
  search?: [Search] extends [never] ? never : Renderable<Search>;
};

type FamilyRenderingControls = {
  'item-identification': RenderingControls<'sprite', 'sprite'>;
  'item-uses': RenderingControls<'sprite'>;
  'ability-effects': RenderingControls<'sprite'>;
  'held-item-effects': RenderingControls<'sprite' | 'name'>;
  'berry-flavors': RenderingControls<'sprite'>;
  'natural-gift': RenderingControls<'sprite'>;
  'pokemon-from-historical-sprite': {
    choices?: Renderable<'sprite' | 'number'>;
    related?: { name?: 'never'; number?: 'never' };
    search?: Renderable<'sprite' | 'number'>;
  };
  'sprite-for-pokemon': {
    subject?: { sprite?: 'never' };
    choices?: { name?: HiddenUntilAnswer; number?: HiddenUntilAnswer };
  };
  'silhouette-for-pokemon': {
    subject?: { sprite?: 'never' };
    choices?: {
      sprite?: 'silhouette';
      name?: HiddenUntilAnswer;
      number?: HiddenUntilAnswer;
    };
  };
  'pokemon-from-silhouette': {
    subject?: { sprite?: 'silhouette' };
    choices?: { sprite?: 'never' };
    related?: { name?: 'never'; number?: 'never' };
    search?: { sprite?: 'never'; number?: EntityRendering['number'] };
  };
  'pokemon-from-pixel-crop': {
    choices?: { sprite?: 'never' };
    related?: { name?: HiddenUntilAnswer; number?: HiddenUntilAnswer };
    search?: { sprite?: 'never'; number?: EntityRendering['number'] };
  };
  'pokemon-by-generation': RenderingControls<never, 'number'>;
  'evolution-chain': {
    subject?: {
      sprite?: HiddenUntilAnswer;
      name?: HiddenUntilAnswer;
      number?: HiddenUntilAnswer;
    };
    choices?: Renderable<'sprite' | 'number'>;
    related?: Renderable<'sprite' | 'name' | 'number'>;
    search?: Renderable<'sprite' | 'number'>;
  };
  'evolution-gained-type': RenderingControls<
    'sprite' | 'name' | 'number' | 'types',
    never,
    'sprite' | 'name' | 'number' | 'types'
  >;
  'super-effective-attacker': {
    subject?: { types?: 'always' | 'after-answer' };
    related?: {
      sprite?: HiddenUntilAnswer;
      name?: HiddenUntilAnswer;
      number?: HiddenUntilAnswer;
    };
  };
  champion: {
    subject?: {
      sprite?: { afterClues: 0 | 1 | 2 | 3 | 4; silhouette?: boolean };
    };
    choices?: { sprite?: 'never'; number?: HiddenUntilAnswer };
    related?: { name?: 'never'; number?: 'never' };
    search?: { sprite?: 'never'; number?: EntityRendering['number'] };
  };
};

/**
 * Rendering overrides a family can consume. Unsupported roles, fields, and
 * answer-revealing values fail at configuration time.
 */
export type RenderingControlsFor<Type extends keyof FamilyRules> =
  Type extends keyof FamilyRenderingControls
    ? FamilyRenderingControls[Type]
    : RenderingControls;

/**
 * Complete controls for one level or the unleveled path. `rendering` overrides
 * the family policy; controls do not inherit from lower levels.
 */
export type QuestionRuleEntry<
  Rules extends { rendering: QuestionRendering },
  Type extends keyof FamilyRules,
> = Omit<Rules, 'rendering'> & {
  rendering?: RenderingControlsFor<Type>;
};

/**
 * One family's rules. Numeric `levels` may be sparse; resolution selects the
 * highest defined level at or below the requested difficulty.
 */
export type QuestionRuleRow<
  Rules extends { rendering: QuestionRendering },
  Type extends keyof FamilyRules,
> = {
  rendering: RenderingControlsFor<Type>;
  unleveled?: QuestionRuleEntry<Rules, Type>;
  levels: DifficultyRules<QuestionRuleEntry<Rules, Type>>;
};
/** Base controls copied into level entries before their specific overrides. */
const controls = {
  'item-identification': {
    view: { answer: { kind: 'text' } },
    distinctItemCategories: false,
    sameItemPocket: false,
    sameItemCategory: false,
    machineDiscChance: 0,
  },
  'item-uses': {
    view: { answer: { kind: 'text' }, subject: { inlineItem: 'sprite' } },
    minimumEffectSimilarity: 0,
    maximumEffectSimilarity: 0.35,
    preferSimilarEffects: true,
    useFullEffectText: false,
    sameItemCategory: false,
    allowMissingSprites: false,
  },
  'weight-comparison': {
    view: { answer: { kind: 'pokemon' } },
  },
  'height-comparison': {
    view: { answer: { kind: 'pokemon' } },
  },
  'move-types': {
    view: { answer: { kind: 'type' } },
    showMoveDescription: false,
    allOptions: false,
    excludeTypeHintNames: false,
  },
  'location-region': {
    view: { answer: { kind: 'text' } },
    allOptions: false,
  },
  'move-category': {
    view: { answer: { kind: 'text', detail: 'move' } },
    statusMovesOnly: false,
    sameMoveType: false,
  },
  'pokedex-categories': {
    view: { answer: { kind: 'pokemon' } },
    sameColorOrShape: false,
    closeAlternatives: false,
    similarityWeights: {
      sharedType: 12,
      shape: 8,
      color: 5,
      generation: 4,
      evolutionStage: 3,
      statMaximum: 3,
      statScale: 80,
    },
  },
  'evolution-conditions': {
    view: { answer: { kind: 'text' } },
    minimumEvolutionConditions: 1,
    multiSelectEvolutionConditions: false,
    exactEvolutionValues: false,
    mixedLevelEvolutionConditions: false,
    compactEvolutionLabels: false,
    exactLevelQuestionChance: 0,
    directEvolutionItems: false,
    evolutionLocations: false,
    preferCloseConditionValues: false,
    allowMissingSprites: false,
  },
  'ability-effects': {
    view: { answer: { kind: 'text' }, subject: { inlineItem: 'sprite' } },
    minimumEffectSimilarity: 0,
    maximumEffectSimilarity: 0.35,
    preferSimilarEffects: true,
    useFullEffectText: false,
    allowMissingSprites: false,
  },
  'held-item-effects': {
    view: {
      answer: { kind: 'text', layout: 'statements' },
      subject: { inlineItem: 'named' },
    },
    minimumEffectSimilarity: 0,
    maximumEffectSimilarity: 0.35,
    preferSimilarEffects: true,
    useFullEffectText: false,
    sameItemCategory: false,
    allowMissingSprites: false,
  },
  'hidden-abilities': {
    view: { answer: { kind: 'text' } },
    sameTypeAbilityDistractors: false,
    allowMissingSprites: false,
  },
  'nature-effects': {
    view: { answer: { kind: 'text', detail: 'nature' } },
    shareNatureStat: false,
  },
  'ev-yields': {
    view: { answer: { kind: 'text' } },
    completeEvYield: false,
    closeAlternatives: false,
  },
  'encounter-locations': {
    view: { answer: { kind: 'pokemon' } },
    sameEncounterMethodWeight: 100,
    encounterConditions: false,
    closeAlternatives: false,
    multiSelectEncounters: false,
    similarityWeights: {
      sharedType: 12,
      shape: 8,
      color: 5,
      generation: 4,
      evolutionStage: 3,
      statMaximum: 3,
      statScale: 80,
    },
  },
  'berry-flavors': {
    view: { answer: { kind: 'text' }, subject: { inlineItem: 'sprite' } },
    completeFlavors: false,
    allOptions: false,
  },
  'natural-gift': {
    view: { answer: { kind: 'type' }, subject: { inlineItem: 'sprite' } },
    allOptions: false,
  },
  'pokemon-from-historical-sprite': {
    view: {
      answer: { kind: 'pokemon' },
      subject: { identity: 'after-answer' },
    },
    distractorRankDirection: 'most-similar',
    distractorPoolSize: 15,
    smallPoolSimilarityRatio: 0.6,
    distantSpeciesFraction: 0.3333333333333333,
    similarityWeights: {
      sharedType: 12,
      shape: 8,
      color: 5,
      generation: 4,
      evolutionStage: 3,
      statMaximum: 3,
      statScale: 80,
    },
    smallPoolPolicy: 'semantic-band',
    currentSpriteChance: 0,
    backSpriteChance: 0,
    frontSpriteChance: 0.75,
  },
  'sprite-for-pokemon': {
    view: { answer: { kind: 'pokemon' } },
    distractorRankDirection: 'most-similar',
    distractorPoolSize: 15,
    smallPoolSimilarityRatio: 0.6,
    distantSpeciesFraction: 0.3333333333333333,
    similarityWeights: {
      sharedType: 12,
      shape: 8,
      color: 5,
      generation: 4,
      evolutionStage: 3,
      statMaximum: 3,
      statScale: 80,
    },
    smallPoolPolicy: 'semantic-band',
  },
  'silhouette-for-pokemon': {
    view: { answer: { kind: 'pokemon' } },
    distractorRankDirection: 'most-similar',
    distractorPoolSize: 15,
    smallPoolSimilarityRatio: 0.6,
    distantSpeciesFraction: 0.3333333333333333,
    similarityWeights: {
      sharedType: 12,
      shape: 8,
      color: 5,
      generation: 4,
      evolutionStage: 3,
      statMaximum: 3,
      statScale: 80,
    },
    smallPoolPolicy: 'semantic-band',
  },
  'pokemon-from-silhouette': {
    view: {
      answer: { kind: 'pokemon' },
      subject: { identity: 'after-answer' },
    },
    distractorRankDirection: 'most-similar',
    distractorPoolSize: 15,
    smallPoolSimilarityRatio: 0.6,
    distantSpeciesFraction: 0.3333333333333333,
    similarityWeights: {
      sharedType: 12,
      shape: 8,
      color: 5,
      generation: 4,
      evolutionStage: 3,
      statMaximum: 3,
      statScale: 80,
    },
    smallPoolPolicy: 'semantic-band',
  },
  'pokemon-from-pixel-crop': {
    view: { answer: { kind: 'pokemon' } },
    distractorRankDirection: 'most-similar',
    distractorPoolSize: 15,
    smallPoolSimilarityRatio: 0.6,
    distantSpeciesFraction: 0.3333333333333333,
    similarityWeights: {
      sharedType: 12,
      shape: 8,
      color: 5,
      generation: 4,
      evolutionStage: 3,
      statMaximum: 3,
      statScale: 80,
    },
    smallPoolPolicy: 'semantic-band',
    cropScale: 1,
  },
  'shiny-pokemon-identification': {
    view: { answer: { kind: 'pokemon' } },
    distractorRankDirection: 'most-similar',
    distractorPoolSize: 15,
    smallPoolSimilarityRatio: 0.6,
    distantSpeciesFraction: 0.3333333333333333,
    similarityWeights: {
      sharedType: 12,
      shape: 8,
      color: 5,
      generation: 4,
      evolutionStage: 3,
      statMaximum: 3,
      statScale: 80,
    },
    smallPoolPolicy: 'semantic-band',
  },
  'pokedex-entry-match': {
    view: {
      answer: { kind: 'pokemon' },
      subject: { identity: 'after-answer' },
    },
    distractorRankDirection: 'most-similar',
    distractorPoolSize: 15,
    smallPoolSimilarityRatio: 0.6,
    distantSpeciesFraction: 0.3333333333333333,
    similarityWeights: {
      sharedType: 12,
      shape: 8,
      color: 5,
      generation: 4,
      evolutionStage: 3,
      statMaximum: 3,
      statScale: 80,
    },
    smallPoolPolicy: 'semantic-band',
  },
  'pokemon-types': {
    similarityWeights: {
      sharedType: 12,
      shape: 8,
      color: 5,
      generation: 4,
      evolutionStage: 3,
      statMaximum: 3,
      statScale: 80,
    },
    view: { answer: { kind: 'type' }, subject: { types: 'after-answer' } },
    singleType: false,
  },
  'type-odd-one-out': {
    view: { answer: { kind: 'pokemon', revealTypes: 'after-answer' } },
    singleType: false,
  },
  'pokemon-by-type': {
    view: { answer: { kind: 'pokemon', revealTypes: 'after-answer' } },
    singleType: false,
  },
  'dual-type-match': {
    view: {
      answer: { kind: 'pokemon', revealTypes: 'after-answer' },
      subject: { types: 'after-answer' },
    },
    distractorRankDirection: 'most-similar',
    distractorPoolSize: 15,
    smallPoolSimilarityRatio: 0.6,
    distantSpeciesFraction: 0.3333333333333333,
    similarityWeights: {
      sharedType: 12,
      shape: 8,
      color: 5,
      generation: 4,
      evolutionStage: 3,
      statMaximum: 3,
      statScale: 80,
    },
    smallPoolPolicy: 'semantic-band',
  },
  'legendary-mythical-selection': {
    view: { answer: { kind: 'pokemon' } },
  },
  'pokemon-by-generation': {
    view: { answer: { kind: 'pokemon' } },
  },
  'evolution-chain': {
    view: { answer: { kind: 'pokemon' } },
    distractorRankDirection: 'most-similar',
    distractorPoolSize: 15,
    smallPoolSimilarityRatio: 0.6,
    distantSpeciesFraction: 0.3333333333333333,
    similarityWeights: {
      sharedType: 12,
      shape: 8,
      color: 5,
      generation: 4,
      evolutionStage: 3,
      statMaximum: 3,
      statScale: 80,
    },
    smallPoolPolicy: 'semantic-band',
  },
  'evolution-gained-type': {
    similarityWeights: {
      sharedType: 12,
      shape: 8,
      color: 5,
      generation: 4,
      evolutionStage: 3,
      statMaximum: 3,
      statScale: 80,
    },
    view: { answer: { kind: 'type' } },
  },
  'pokemon-abilities': {
    view: { answer: { kind: 'text' } },
    plausibleProperties: false,
  },
  'level-up-moves': {
    view: { answer: { kind: 'text' } },
    plausibleProperties: false,
  },
  'stat-extremes': {
    view: { answer: { kind: 'pokemon' } },
    statGap: null,
  },
  'type-matchup': {
    view: { answer: { kind: 'type' }, subject: { types: 'after-answer' } },
    singleType: false,
    showTypes: false,
    multipliers: [4, 2, 0.5, 0.25],
  },
  'super-effective-attacker': {
    view: {
      answer: {
        kind: 'pokemon',
        revealTypes: 'after-answer',
        layout: 'super-effective-attacker',
      },
      subject: { types: 'after-answer' },
    },
    distractorRankDirection: 'most-similar',
    distractorPoolSize: 15,
    smallPoolSimilarityRatio: 0.6,
    distantSpeciesFraction: 0.3333333333333333,
    similarityWeights: {
      sharedType: 12,
      shape: 8,
      color: 5,
      generation: 4,
      evolutionStage: 3,
      statMaximum: 3,
      statScale: 80,
    },
    smallPoolPolicy: 'semantic-band',
    singleType: false,
    showTypes: false,
    multipliers: [4, 2, 0.5, 0.25],
  },
  champion: {
    view: {
      answer: { kind: 'pokemon' },
      subject: { identity: 'after-answer' },
    },
    distractorRankDirection: 'most-similar',
    distractorPoolSize: 15,
    smallPoolSimilarityRatio: 0.6,
    distantSpeciesFraction: 0.3333333333333333,
    similarityWeights: {
      sharedType: 12,
      shape: 8,
      color: 5,
      generation: 4,
      evolutionStage: 3,
      statMaximum: 3,
      statScale: 80,
    },
    smallPoolPolicy: 'semantic-band',
    finale: null,
  },
} as const satisfies {
  [Type in keyof FamilyRules]: Partial<
    Omit<FamilyRules[Type], 'response' | 'rendering' | 'view'>
  > & { view: FamilyRules[Type]['view'] };
};

/** Visibility defaults applied before family and level rendering overrides. */
export const baseQuestionRendering: QuestionRendering = {
  subject: { sprite: 'always', name: 'always', number: 'always' },
  choices: { sprite: 'always', name: 'always', number: 'always' },
  related: { sprite: 'always', name: 'always', number: 'always' },
  search: { sprite: 'always', name: 'always', number: 'always' },
};

/** Family rendering overrides, checked against each family's usable fields. */
const renderings = {
  'item-identification': {},
  'item-uses': {},
  'weight-comparison': {},
  'height-comparison': {},
  'move-types': {},
  'location-region': {},
  'move-category': {},
  'pokedex-categories': {},
  'evolution-conditions': {},
  'ability-effects': {},
  'held-item-effects': {},
  'hidden-abilities': {},
  'nature-effects': {},
  'ev-yields': {},
  'encounter-locations': {},
  'berry-flavors': {},
  'natural-gift': {},
  'pokemon-from-historical-sprite': {
    choices: { sprite: 'never' },
    search: { sprite: 'never' },
  },
  'sprite-for-pokemon': {
    subject: { sprite: 'never' },
    choices: { name: 'after-answer', number: 'after-answer' },
  },
  'silhouette-for-pokemon': {
    subject: { sprite: 'never' },
    choices: {
      sprite: 'silhouette',
      name: 'after-answer',
      number: 'after-answer',
    },
  },
  'pokemon-from-silhouette': {
    subject: { sprite: 'silhouette' },
    choices: { sprite: 'never' },
    search: { sprite: 'never' },
  },
  'pokemon-from-pixel-crop': {
    choices: { sprite: 'never' },
    related: { name: 'after-answer', number: 'after-answer' },
    search: { sprite: 'never' },
  },
  'shiny-pokemon-identification': {},
  'pokedex-entry-match': {},
  'pokemon-types': {},
  'type-odd-one-out': {},
  'pokemon-by-type': {},
  'dual-type-match': {},
  'legendary-mythical-selection': {},
  'pokemon-by-generation': { choices: { number: 'after-answer' } },
  'evolution-chain': {
    subject: {
      sprite: 'after-answer',
      name: 'after-answer',
      number: 'after-answer',
    },
    choices: { sprite: 'never', number: 'never' },
    search: { sprite: 'never' },
  },
  'evolution-gained-type': {
    related: {
      sprite: 'after-answer',
      name: 'after-answer',
      number: 'after-answer',
    },
  },
  'pokemon-abilities': {},
  'level-up-moves': {},
  'stat-extremes': {},
  'type-matchup': {},
  'super-effective-attacker': {
    related: { sprite: 'after-answer', name: 'never', number: 'never' },
  },
  champion: {
    subject: { sprite: { afterClues: 4, silhouette: true } },
    choices: { sprite: 'never', number: 'after-answer' },
    search: { sprite: 'never', number: 'never' },
  },
} satisfies { [Type in keyof FamilyRules]: RenderingControlsFor<Type> };

/** Source of leveled and unleveled builder configuration for every family. */
export const questionRules = {
  'item-identification': {
    rendering: renderings['item-identification'],
    levels: {
      1: {
        ...controls['item-identification'],
        distinctItemCategories: true,
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
      },
      2: {
        ...controls['item-identification'],
        sameItemPocket: true,
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
      },
      3: {
        ...controls['item-identification'],
        sameItemCategory: true,
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
      },
      4: {
        ...controls['item-identification'],
        response: { kind: 'search', candidates: 'provided' },
      },
      5: {
        ...controls['item-identification'],
        machineDiscChance: 0.5,
        response: { kind: 'search', candidates: 'provided' },
      },
    },
  },
  'item-uses': {
    rendering: renderings['item-uses'],
    levels: {
      2: {
        ...controls['item-uses'],
        minimumEffectSimilarity: 0,
        maximumEffectSimilarity: 0.35,
        preferSimilarEffects: false,
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
      },
      3: {
        ...controls['item-uses'],
        sameItemCategory: true,
        minimumEffectSimilarity: 0,
        maximumEffectSimilarity: 0.8,
        preferSimilarEffects: false,
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
      },
      4: {
        ...controls['item-uses'],
        sameItemCategory: true,
        minimumEffectSimilarity: 0.3,
        maximumEffectSimilarity: 0.8,
        preferSimilarEffects: true,
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
      },
      5: {
        ...controls['item-uses'],
        sameItemCategory: true,
        minimumEffectSimilarity: 0.5,
        maximumEffectSimilarity: 0.8,
        preferSimilarEffects: true,
        useFullEffectText: true,
        allowMissingSprites: true,
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
      },
    },
  },
  'weight-comparison': {
    rendering: renderings['weight-comparison'],
    levels: {
      2: {
        ...controls['weight-comparison'],
        measurement: {
          minimumRatio: 2,
          maximumRatio: Infinity,
          maximumSpread: Infinity,
        },
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
      },
      3: {
        ...controls['weight-comparison'],
        measurement: {
          minimumRatio: 1.3,
          maximumRatio: Infinity,
          maximumSpread: Infinity,
        },
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
      },
      4: {
        ...controls['weight-comparison'],
        measurement: {
          minimumRatio: 1.3,
          maximumRatio: 2,
          maximumSpread: 2,
        },
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
      },
      5: {
        ...controls['weight-comparison'],
        measurement: {
          minimumRatio: 1.3,
          maximumRatio: 1.5,
          maximumSpread: 1.5,
        },
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
      },
    },
  },
  'height-comparison': {
    rendering: renderings['height-comparison'],
    levels: {
      2: {
        ...controls['height-comparison'],
        measurement: {
          minimumRatio: 2,
          maximumRatio: Infinity,
          maximumSpread: Infinity,
        },
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
      },
      3: {
        ...controls['height-comparison'],
        measurement: {
          minimumRatio: 1.3,
          maximumRatio: Infinity,
          maximumSpread: Infinity,
        },
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
      },
      4: {
        ...controls['height-comparison'],
        measurement: {
          minimumRatio: 1.3,
          maximumRatio: 2,
          maximumSpread: 2,
        },
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
      },
      5: {
        ...controls['height-comparison'],
        measurement: {
          minimumRatio: 1.3,
          maximumRatio: 1.5,
          maximumSpread: 1.5,
        },
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
      },
    },
  },
  'move-types': {
    rendering: renderings['move-types'],
    levels: {
      2: {
        ...controls['move-types'],
        showMoveDescription: true,
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
      },
      3: {
        ...controls['move-types'],
        allOptions: true,
        excludeTypeHintNames: true,
        response: {
          kind: 'choices',
          minimumOptions: 2,
        },
      },
    },
  },
  'location-region': {
    rendering: renderings['location-region'],
    levels: {
      2: {
        ...controls['location-region'],
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
      },
      3: {
        ...controls['location-region'],
        allOptions: true,
        response: {
          kind: 'choices',
          minimumOptions: 2,
        },
      },
    },
  },
  'move-category': {
    rendering: renderings['move-category'],
    levels: {
      2: {
        ...controls['move-category'],
        statusMovesOnly: true,
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
      },
      3: {
        ...controls['move-category'],
        statusMovesOnly: false,
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
      },
      4: {
        ...controls['move-category'],
        statusMovesOnly: false,
        sameMoveType: true,
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
      },
    },
  },
  'pokedex-categories': {
    rendering: renderings['pokedex-categories'],
    levels: {
      2: {
        ...controls['pokedex-categories'],
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
      },
      3: {
        ...controls['pokedex-categories'],
        sameColorOrShape: true,
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
      },
      5: {
        ...controls['pokedex-categories'],
        sameColorOrShape: true,
        closeAlternatives: true,
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
      },
    },
  },
  'evolution-conditions': {
    rendering: renderings['evolution-conditions'],
    levels: {
      3: {
        ...controls['evolution-conditions'],
        minimumEvolutionConditions: 1,
        mixedLevelEvolutionConditions: true,
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
      },
      4: {
        ...controls['evolution-conditions'],
        minimumEvolutionConditions: 1,
        mixedLevelEvolutionConditions: true,
        evolutionLocations: true,
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
      },
      5: {
        ...controls['evolution-conditions'],
        minimumEvolutionConditions: 2,
        multiSelectEvolutionConditions: true,
        exactEvolutionValues: true,
        compactEvolutionLabels: true,
        exactLevelQuestionChance: 0.2,
        directEvolutionItems: true,
        evolutionLocations: true,
        preferCloseConditionValues: true,
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
      },
    },
  },
  'ability-effects': {
    rendering: renderings['ability-effects'],
    levels: {
      3: {
        ...controls['ability-effects'],
        minimumEffectSimilarity: 0,
        maximumEffectSimilarity: 0.35,
        preferSimilarEffects: false,
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
      },
      4: {
        ...controls['ability-effects'],
        minimumEffectSimilarity: 0,
        maximumEffectSimilarity: 0.35,
        preferSimilarEffects: true,
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
      },
      5: {
        ...controls['ability-effects'],
        minimumEffectSimilarity: 0,
        maximumEffectSimilarity: 0.35,
        preferSimilarEffects: true,
        allowMissingSprites: true,
        response: {
          kind: 'search',
          candidates: 'provided',
        },
      },
    },
  },
  'held-item-effects': {
    rendering: renderings['held-item-effects'],
    levels: {
      3: {
        ...controls['held-item-effects'],
        sameItemCategory: true,
        minimumEffectSimilarity: 0,
        maximumEffectSimilarity: 0.8,
        preferSimilarEffects: false,
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
      },
      4: {
        ...controls['held-item-effects'],
        sameItemCategory: true,
        minimumEffectSimilarity: 0.3,
        maximumEffectSimilarity: 0.8,
        preferSimilarEffects: true,
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
      },
      5: {
        ...controls['held-item-effects'],
        sameItemCategory: true,
        minimumEffectSimilarity: 0.5,
        maximumEffectSimilarity: 0.8,
        preferSimilarEffects: true,
        useFullEffectText: true,
        allowMissingSprites: true,
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
      },
    },
  },
  'hidden-abilities': {
    rendering: renderings['hidden-abilities'],
    levels: {
      4: {
        ...controls['hidden-abilities'],
        sameTypeAbilityDistractors: false,
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
      },
      5: {
        ...controls['hidden-abilities'],
        sameTypeAbilityDistractors: true,
        allowMissingSprites: true,
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
      },
    },
  },
  'nature-effects': {
    rendering: renderings['nature-effects'],
    levels: {
      4: {
        ...controls['nature-effects'],
        shareNatureStat: false,
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
      },
      5: {
        ...controls['nature-effects'],
        shareNatureStat: true,
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
      },
    },
  },
  'ev-yields': {
    rendering: renderings['ev-yields'],
    levels: {
      4: {
        ...controls['ev-yields'],
        completeEvYield: false,
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
      },
      5: {
        ...controls['ev-yields'],
        completeEvYield: true,
        closeAlternatives: true,
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
      },
    },
  },
  'encounter-locations': {
    rendering: renderings['encounter-locations'],
    levels: {
      4: {
        ...controls['encounter-locations'],
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
      },
      5: {
        ...controls['encounter-locations'],
        encounterConditions: true,
        closeAlternatives: true,
        multiSelectEncounters: true,
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
      },
    },
  },
  'berry-flavors': {
    rendering: renderings['berry-flavors'],
    levels: {
      4: {
        ...controls['berry-flavors'],
        completeFlavors: false,
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
      },
      5: {
        ...controls['berry-flavors'],
        completeFlavors: true,
        allOptions: true,
        response: {
          kind: 'choices',
          minimumOptions: 2,
        },
      },
    },
  },
  'natural-gift': {
    rendering: renderings['natural-gift'],
    levels: {
      5: {
        ...controls['natural-gift'],
        allOptions: true,
        response: {
          kind: 'choices',
          minimumOptions: 2,
        },
      },
    },
  },
  'pokemon-from-historical-sprite': {
    rendering: renderings['pokemon-from-historical-sprite'],
    unleveled: {
      ...controls['pokemon-from-historical-sprite'],
      response: {
        kind: 'choices',
        minimumOptions: 4,
      },
    },
    levels: {
      1: {
        ...controls['pokemon-from-historical-sprite'],
        currentSpriteChance: 1,
        distractorRankDirection: 'least-similar',
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
      },
      2: {
        ...controls['pokemon-from-historical-sprite'],
        currentSpriteChance: 1,
        distractorRankDirection: 'most-similar',
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
      },
      4: {
        ...controls['pokemon-from-historical-sprite'],
        distractorRankDirection: 'most-similar',
        distractorPoolSize: 6,
        smallPoolPolicy: 'fixed-size',
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
      },
      5: {
        ...controls['pokemon-from-historical-sprite'],
        response: {
          kind: 'search',
          candidates: 'pool',
        },
        backSpriteChance: 1,
      },
    },
  },
  'sprite-for-pokemon': {
    rendering: renderings['sprite-for-pokemon'],
    unleveled: {
      ...controls['sprite-for-pokemon'],
      response: {
        kind: 'choices',
        minimumOptions: 4,
      },
    },
    levels: {
      1: {
        ...controls['sprite-for-pokemon'],
        distractorRankDirection: 'least-similar',
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
      },
      3: {
        ...controls['sprite-for-pokemon'],
        distractorRankDirection: 'most-similar',
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
      },
      4: {
        ...controls['sprite-for-pokemon'],
        distractorRankDirection: 'most-similar',
        distractorPoolSize: 6,
        smallPoolPolicy: 'fixed-size',
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
      },
      5: {
        ...controls['sprite-for-pokemon'],
        distractorRankDirection: 'most-similar',
        distractorPoolSize: 3,
        smallPoolPolicy: 'fixed-size',
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
      },
    },
  },
  'silhouette-for-pokemon': {
    rendering: renderings['silhouette-for-pokemon'],
    unleveled: {
      ...controls['silhouette-for-pokemon'],
      response: {
        kind: 'choices',
        minimumOptions: 4,
      },
    },
    levels: {
      2: {
        ...controls['silhouette-for-pokemon'],
        distractorRankDirection: 'least-similar',
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
      },
      4: {
        ...controls['silhouette-for-pokemon'],
        distractorRankDirection: 'most-similar',
        distractorPoolSize: 6,
        smallPoolPolicy: 'fixed-size',
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
      },
      5: {
        ...controls['silhouette-for-pokemon'],
        distractorRankDirection: 'most-similar',
        distractorPoolSize: 3,
        smallPoolPolicy: 'fixed-size',
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
      },
    },
  },
  'pokemon-from-silhouette': {
    rendering: renderings['pokemon-from-silhouette'],
    unleveled: {
      ...controls['pokemon-from-silhouette'],
      response: {
        kind: 'choices',
        minimumOptions: 4,
      },
    },
    levels: {
      2: {
        ...controls['pokemon-from-silhouette'],
        distractorRankDirection: 'least-similar',
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
      },
      3: {
        ...controls['pokemon-from-silhouette'],
        distractorRankDirection: 'most-similar',
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
      },
      5: {
        ...controls['pokemon-from-silhouette'],
        response: {
          kind: 'search',
          candidates: 'pool',
        },
      },
    },
  },
  'pokemon-from-pixel-crop': {
    rendering: renderings['pokemon-from-pixel-crop'],
    unleveled: {
      ...controls['pokemon-from-pixel-crop'],
      response: {
        kind: 'choices',
        minimumOptions: 4,
      },
    },
    levels: {
      3: {
        ...controls['pokemon-from-pixel-crop'],
        cropScale: 0.65,
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
      },
      4: {
        ...controls['pokemon-from-pixel-crop'],
        distractorRankDirection: 'most-similar',
        distractorPoolSize: 6,
        smallPoolPolicy: 'fixed-size',
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
      },
      5: {
        ...controls['pokemon-from-pixel-crop'],
        response: {
          kind: 'search',
          candidates: 'pool',
        },
        cropScale: 1.4,
      },
    },
  },
  'shiny-pokemon-identification': {
    rendering: renderings['shiny-pokemon-identification'],
    unleveled: {
      ...controls['shiny-pokemon-identification'],
      response: {
        kind: 'choices',
        minimumOptions: 4,
      },
    },
    levels: {
      3: {
        ...controls['shiny-pokemon-identification'],
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
      },
      4: {
        ...controls['shiny-pokemon-identification'],
        distractorRankDirection: 'most-similar',
        distractorPoolSize: 6,
        smallPoolPolicy: 'fixed-size',
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
      },
      5: {
        ...controls['shiny-pokemon-identification'],
        distractorRankDirection: 'most-similar',
        distractorPoolSize: 3,
        smallPoolPolicy: 'fixed-size',
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
      },
    },
  },
  'pokedex-entry-match': {
    rendering: renderings['pokedex-entry-match'],
    unleveled: {
      ...controls['pokedex-entry-match'],
      response: {
        kind: 'choices',
        minimumOptions: 4,
      },
    },
    levels: {
      2: {
        ...controls['pokedex-entry-match'],
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
      },
      4: {
        ...controls['pokedex-entry-match'],
        response: {
          kind: 'search',
          candidates: 'pool',
        },
        view: {
          answer: { kind: 'pokemon' },
          subject: { identity: 'after-answer', portrait: 'after-answer' },
        },
      },
    },
  },
  'pokemon-types': {
    rendering: renderings['pokemon-types'],
    unleveled: {
      ...controls['pokemon-types'],
      response: {
        kind: 'choices',
        minimumOptions: 4,
      },
    },
    levels: {
      2: {
        ...controls['pokemon-types'],
        singleType: true,
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
      },
      3: {
        ...controls['pokemon-types'],
        response: {
          kind: 'type-grid',
          correct: 'subject-types',
        },
      },
    },
  },
  'type-odd-one-out': {
    rendering: renderings['type-odd-one-out'],
    unleveled: {
      ...controls['type-odd-one-out'],
      response: {
        kind: 'choices',
        minimumOptions: 4,
      },
    },
    levels: {
      2: {
        ...controls['type-odd-one-out'],
        singleType: true,
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
      },
      3: {
        ...controls['type-odd-one-out'],
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
      },
    },
  },
  'pokemon-by-type': {
    rendering: renderings['pokemon-by-type'],
    unleveled: {
      ...controls['pokemon-by-type'],
      response: {
        kind: 'choices',
        minimumOptions: 4,
      },
    },
    levels: {
      2: {
        ...controls['pokemon-by-type'],
        singleType: true,
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
      },
      3: {
        ...controls['pokemon-by-type'],
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
      },
    },
  },
  'dual-type-match': {
    rendering: renderings['dual-type-match'],
    unleveled: {
      ...controls['dual-type-match'],
      response: {
        kind: 'choices',
        minimumOptions: 4,
      },
    },
    levels: {
      3: {
        ...controls['dual-type-match'],
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
      },
    },
  },
  'legendary-mythical-selection': {
    rendering: renderings['legendary-mythical-selection'],
    unleveled: {
      ...controls['legendary-mythical-selection'],
      response: {
        kind: 'choices',
        minimumOptions: 4,
      },
    },
    levels: {
      2: {
        ...controls['legendary-mythical-selection'],
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
      },
    },
  },
  'pokemon-by-generation': {
    rendering: renderings['pokemon-by-generation'],
    unleveled: {
      ...controls['pokemon-by-generation'],
      response: {
        kind: 'choices',
        minimumOptions: 4,
      },
    },
    levels: {
      2: {
        ...controls['pokemon-by-generation'],
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
      },
    },
  },
  'evolution-chain': {
    rendering: renderings['evolution-chain'],
    unleveled: {
      ...controls['evolution-chain'],
      response: {
        kind: 'choices',
        minimumOptions: 4,
      },
    },
    levels: {
      2: {
        ...controls['evolution-chain'],
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
      },
      4: {
        ...controls['evolution-chain'],
        response: {
          kind: 'search',
          candidates: 'pool',
        },
      },
    },
  },
  'evolution-gained-type': {
    rendering: renderings['evolution-gained-type'],
    unleveled: {
      ...controls['evolution-gained-type'],
      response: {
        kind: 'choices',
        minimumOptions: 4,
      },
    },
    levels: {
      3: {
        ...controls['evolution-gained-type'],
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
      },
      5: {
        ...controls['evolution-gained-type'],
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
        rendering: {
          subject: { types: 'after-answer' },
          related: { types: 'after-answer' },
        },
      },
    },
  },
  'pokemon-abilities': {
    rendering: renderings['pokemon-abilities'],
    unleveled: {
      ...controls['pokemon-abilities'],
      response: {
        kind: 'choices',
        minimumOptions: 4,
      },
    },
    levels: {
      3: {
        ...controls['pokemon-abilities'],
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
      },
      5: {
        ...controls['pokemon-abilities'],
        plausibleProperties: true,
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
      },
    },
  },
  'level-up-moves': {
    rendering: renderings['level-up-moves'],
    unleveled: {
      ...controls['level-up-moves'],
      response: {
        kind: 'choices',
        minimumOptions: 4,
      },
    },
    levels: {
      4: {
        ...controls['level-up-moves'],
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
      },
      5: {
        ...controls['level-up-moves'],
        plausibleProperties: true,
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
      },
    },
  },
  'stat-extremes': {
    rendering: renderings['stat-extremes'],
    unleveled: {
      ...controls['stat-extremes'],
      response: {
        kind: 'choices',
        minimumOptions: 4,
      },
    },
    levels: {
      3: {
        ...controls['stat-extremes'],
        statGap: [41, Infinity],
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
      },
      4: {
        ...controls['stat-extremes'],
        statGap: [21, 40],
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
      },
      5: {
        ...controls['stat-extremes'],
        statGap: [10, 20],
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
      },
    },
  },
  'type-matchup': {
    rendering: renderings['type-matchup'],
    unleveled: {
      ...controls['type-matchup'],
      response: {
        kind: 'choices',
        minimumOptions: 4,
      },
    },
    levels: {
      1: {
        ...controls['type-matchup'],
        singleType: true,
        showTypes: true,
        multipliers: [2],
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
      },
      2: {
        ...controls['type-matchup'],
        singleType: true,
        multipliers: [2],
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
      },
      3: {
        ...controls['type-matchup'],
        showTypes: true,
        multipliers: [2, 4],
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
      },
      4: {
        ...controls['type-matchup'],
        multipliers: [0.25, 0.5, 2, 4],
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
      },
      5: {
        ...controls['type-matchup'],
        response: {
          kind: 'type-grid',
          correct: 'effectiveness',
        },
        multipliers: [0, 0.25, 0.5, 1, 2, 4],
      },
    },
  },
  'super-effective-attacker': {
    rendering: renderings['super-effective-attacker'],
    unleveled: {
      ...controls['super-effective-attacker'],
      response: {
        kind: 'choices',
        minimumOptions: 4,
      },
    },
    levels: {
      2: {
        ...controls['super-effective-attacker'],
        singleType: true,
        showTypes: true,
        multipliers: [2],
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
      },
      3: {
        ...controls['super-effective-attacker'],
        showTypes: true,
        multipliers: [2, 4],
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
        rendering: { subject: { types: 'after-answer' } },
      },
      4: {
        ...controls['super-effective-attacker'],
        multipliers: [0.25, 0.5, 2, 4],
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
      },
      5: {
        ...controls['super-effective-attacker'],
        distractorRankDirection: 'most-similar',
        distractorPoolSize: 3,
        multipliers: [0.25, 0.5, 2, 4],
        smallPoolPolicy: 'fixed-size',
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
      },
    },
  },
  champion: {
    rendering: renderings['champion'],
    unleveled: {
      ...controls['champion'],
      response: {
        kind: 'choices',
        minimumOptions: 4,
      },
    },
    levels: {
      1: {
        ...controls['champion'],
        finale: {
          opening: 'choices-types',
          assistance: false,
          penalty: 2,
        },
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
      },
      2: {
        ...controls['champion'],
        finale: {
          opening: 'choices',
          assistance: false,
          penalty: 1,
        },
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
      },
      3: {
        ...controls['champion'],
        finale: {
          opening: 'search',
          assistance: true,
          penalty: 0,
        },
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
      },
      5: {
        ...controls['champion'],
        finale: {
          opening: 'search',
          assistance: false,
          penalty: 0,
        },
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
      },
    },
  },
} satisfies {
  [Type in keyof FamilyRules]: QuestionRuleRow<FamilyRules[Type], Type>;
};
