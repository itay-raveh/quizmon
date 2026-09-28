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
  /** Prompt subject fields this family can change. */
  subject?: [Subject] extends [never] ? never : Renderable<Subject>;
  /** Answer choice fields this family can change. */
  choices?: [Choices] extends [never] ? never : Renderable<Choices>;
  /** Related-entity fields this family can change. */
  related?: [Related] extends [never] ? never : Renderable<Related>;
  /** Search-result fields this family can change. */
  search?: [Search] extends [never] ? never : Renderable<Search>;
};

/** Only fields with a real rendering consumer are configurable per family. */
type FamilyRenderingControls = {
  itemIdentification: RenderingControls<'sprite', 'sprite'>;
  itemUses: RenderingControls<'sprite'>;
  abilityEffects: RenderingControls<'sprite'>;
  heldItemEffects: RenderingControls<'sprite' | 'name'>;
  berryFlavors: RenderingControls<'sprite'>;
  naturalGift: RenderingControls<'sprite'>;
  pokemonFromHistoricalSprite: {
    choices?: Renderable<'sprite' | 'number'>;
    related?: { name?: 'never'; number?: 'never' };
    search?: Renderable<'sprite' | 'number'>;
  };
  spriteForPokemon: {
    subject?: { sprite?: 'never' };
    choices?: { name?: HiddenUntilAnswer; number?: HiddenUntilAnswer };
  };
  silhouetteForPokemon: {
    subject?: { sprite?: 'never' };
    choices?: {
      sprite?: 'silhouette';
      name?: HiddenUntilAnswer;
      number?: HiddenUntilAnswer;
    };
  };
  pokemonFromSilhouette: {
    subject?: { sprite?: 'silhouette' };
    choices?: { sprite?: 'never' };
    related?: { name?: 'never'; number?: 'never' };
    search?: { sprite?: 'never'; number?: EntityRendering['number'] };
  };
  pokemonFromPixelCrop: {
    choices?: { sprite?: 'never' };
    related?: { name?: HiddenUntilAnswer; number?: HiddenUntilAnswer };
    search?: { sprite?: 'never'; number?: EntityRendering['number'] };
  };
  pokemonByGeneration: RenderingControls<never, 'number'>;
  evolutionChain: {
    subject?: {
      sprite?: HiddenUntilAnswer;
      name?: HiddenUntilAnswer;
      number?: HiddenUntilAnswer;
    };
    choices?: Renderable<'sprite' | 'number'>;
    related?: Renderable<'sprite' | 'name' | 'number'>;
    search?: Renderable<'sprite' | 'number'>;
  };
  evolutionGainedType: RenderingControls<
    'sprite' | 'name' | 'number' | 'types',
    never,
    'sprite' | 'name' | 'number' | 'types'
  >;
  superEffectiveAttacker: {
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
  /** Visibility changes applied after the family policy. */
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
  /** Family visibility changes applied after the base policy. */
  rendering: RenderingControlsFor<Type>;
  /** Complete rules for questions without a difficulty level. */
  unleveled?: QuestionRuleEntry<Rules, Type>;
  /** Complete numeric level entries; the highest available level is selected. */
  levels: DifficultyRules<QuestionRuleEntry<Rules, Type>>;
};
/** Base controls copied into level entries before their specific overrides. */
const controls = {
  itemIdentification: {
    view: { answer: { kind: 'text' } },
    distinctItemCategories: false,
    sameItemPocket: false,
    sameItemCategory: false,
    machineDiscChance: 0,
  },
  itemUses: {
    view: { answer: { kind: 'text' }, subject: { inlineItem: 'sprite' } },
    minimumEffectSimilarity: 0,
    maximumEffectSimilarity: 0.35,
    preferSimilarEffects: true,
    useFullEffectText: false,
    sameItemCategory: false,
    allowMissingSprites: false,
  },
  weightComparison: {
    view: { answer: { kind: 'pokemon' } },
  },
  heightComparison: {
    view: { answer: { kind: 'pokemon' } },
  },
  moveTypes: {
    view: { answer: { kind: 'type' } },
    showMoveDescription: false,
    allOptions: false,
    excludeTypeHintNames: false,
  },
  locationRegion: {
    view: { answer: { kind: 'text' } },
    allOptions: false,
  },
  moveCategory: {
    view: { answer: { kind: 'text', detail: 'move' } },
    statusMovesOnly: false,
    sameMoveType: false,
  },
  pokedexCategories: {
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
  evolutionConditions: {
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
  abilityEffects: {
    view: { answer: { kind: 'text' }, subject: { inlineItem: 'sprite' } },
    minimumEffectSimilarity: 0,
    maximumEffectSimilarity: 0.35,
    preferSimilarEffects: true,
    useFullEffectText: false,
    allowMissingSprites: false,
  },
  heldItemEffects: {
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
  hiddenAbilities: {
    view: { answer: { kind: 'text' } },
    sameTypeAbilityDistractors: false,
    allowMissingSprites: false,
  },
  natureEffects: {
    view: { answer: { kind: 'text', detail: 'nature' } },
    shareNatureStat: false,
  },
  evYields: {
    view: { answer: { kind: 'text' } },
    completeEvYield: false,
    closeAlternatives: false,
  },
  encounterLocations: {
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
  berryFlavors: {
    view: { answer: { kind: 'text' }, subject: { inlineItem: 'sprite' } },
    completeFlavors: false,
  },
  naturalGift: {
    view: { answer: { kind: 'type' }, subject: { inlineItem: 'sprite' } },
  },
  pokemonFromHistoricalSprite: {
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
  spriteForPokemon: {
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
  silhouetteForPokemon: {
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
  pokemonFromSilhouette: {
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
  pokemonFromPixelCrop: {
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
  shinyPokemonIdentification: {
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
  pokedexEntryMatch: {
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
  pokemonTypes: {
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
  typeOddOneOut: {
    view: { answer: { kind: 'pokemon', revealTypes: 'after-answer' } },
    singleType: false,
  },
  pokemonByType: {
    view: { answer: { kind: 'pokemon', revealTypes: 'after-answer' } },
    singleType: false,
  },
  dualTypeMatch: {
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
  legendaryMythicalSelection: {
    view: { answer: { kind: 'pokemon' } },
  },
  pokemonByGeneration: {
    view: { answer: { kind: 'pokemon' } },
  },
  evolutionChain: {
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
  evolutionGainedType: {
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
  pokemonAbilities: {
    view: { answer: { kind: 'text' } },
    plausibleProperties: false,
  },
  levelUpMoves: {
    view: { answer: { kind: 'text' } },
    plausibleProperties: false,
  },
  statExtremes: {
    view: { answer: { kind: 'pokemon' } },
    statGap: null,
  },
  typeMatchup: {
    view: { answer: { kind: 'type' }, subject: { types: 'after-answer' } },
    singleType: false,
    showTypes: false,
    multipliers: [4, 2, 0.5, 0.25],
  },
  superEffectiveAttacker: {
    view: {
      answer: {
        kind: 'pokemon',
        revealTypes: 'after-answer',
        layout: 'superEffectiveAttacker',
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
  itemIdentification: {},
  itemUses: {},
  weightComparison: {},
  heightComparison: {},
  moveTypes: {},
  locationRegion: {},
  moveCategory: {},
  pokedexCategories: {},
  evolutionConditions: {},
  abilityEffects: {},
  heldItemEffects: {},
  hiddenAbilities: {},
  natureEffects: {},
  evYields: {},
  encounterLocations: {},
  berryFlavors: {},
  naturalGift: {},
  pokemonFromHistoricalSprite: {
    choices: { sprite: 'never' },
    search: { sprite: 'never' },
  },
  spriteForPokemon: {
    subject: { sprite: 'never' },
    choices: { name: 'after-answer', number: 'after-answer' },
  },
  silhouetteForPokemon: {
    subject: { sprite: 'never' },
    choices: {
      sprite: 'silhouette',
      name: 'after-answer',
      number: 'after-answer',
    },
  },
  pokemonFromSilhouette: {
    subject: { sprite: 'silhouette' },
    choices: { sprite: 'never' },
    search: { sprite: 'never' },
  },
  pokemonFromPixelCrop: {
    choices: { sprite: 'never' },
    related: { name: 'after-answer', number: 'after-answer' },
    search: { sprite: 'never' },
  },
  shinyPokemonIdentification: {},
  pokedexEntryMatch: {},
  pokemonTypes: {},
  typeOddOneOut: {},
  pokemonByType: {},
  dualTypeMatch: {},
  legendaryMythicalSelection: {},
  pokemonByGeneration: { choices: { number: 'after-answer' } },
  evolutionChain: {
    subject: {
      sprite: 'after-answer',
      name: 'after-answer',
      number: 'after-answer',
    },
    choices: { sprite: 'never', number: 'never' },
    search: { sprite: 'never' },
  },
  evolutionGainedType: {
    related: {
      sprite: 'after-answer',
      name: 'after-answer',
      number: 'after-answer',
    },
  },
  pokemonAbilities: {},
  levelUpMoves: {},
  statExtremes: {},
  typeMatchup: {},
  superEffectiveAttacker: {
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
  itemIdentification: {
    rendering: renderings.itemIdentification,
    levels: {
      1: {
        ...controls.itemIdentification,
        distinctItemCategories: true,
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
      },
      2: {
        ...controls.itemIdentification,
        sameItemPocket: true,
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
      },
      3: {
        ...controls.itemIdentification,
        sameItemCategory: true,
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
      },
      4: {
        ...controls.itemIdentification,
        response: { kind: 'search', candidates: 'provided' },
      },
      5: {
        ...controls.itemIdentification,
        machineDiscChance: 0.5,
        response: { kind: 'search', candidates: 'provided' },
      },
    },
  },
  itemUses: {
    rendering: renderings.itemUses,
    levels: {
      2: {
        ...controls.itemUses,
        minimumEffectSimilarity: 0,
        maximumEffectSimilarity: 0.35,
        preferSimilarEffects: false,
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
      },
      3: {
        ...controls.itemUses,
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
        ...controls.itemUses,
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
        ...controls.itemUses,
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
  weightComparison: {
    rendering: renderings.weightComparison,
    levels: {
      2: {
        ...controls.weightComparison,
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
        ...controls.weightComparison,
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
        ...controls.weightComparison,
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
        ...controls.weightComparison,
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
  heightComparison: {
    rendering: renderings.heightComparison,
    levels: {
      2: {
        ...controls.heightComparison,
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
        ...controls.heightComparison,
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
        ...controls.heightComparison,
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
        ...controls.heightComparison,
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
  moveTypes: {
    rendering: renderings.moveTypes,
    levels: {
      2: {
        ...controls.moveTypes,
        showMoveDescription: true,
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
      },
      3: {
        ...controls.moveTypes,
        allOptions: true,
        excludeTypeHintNames: true,
        response: {
          kind: 'choices',
          minimumOptions: 2,
        },
      },
    },
  },
  locationRegion: {
    rendering: renderings.locationRegion,
    levels: {
      2: {
        ...controls.locationRegion,
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
      },
      3: {
        ...controls.locationRegion,
        allOptions: true,
        response: {
          kind: 'choices',
          minimumOptions: 2,
        },
      },
    },
  },
  moveCategory: {
    rendering: renderings.moveCategory,
    levels: {
      2: {
        ...controls.moveCategory,
        statusMovesOnly: true,
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
      },
      3: {
        ...controls.moveCategory,
        statusMovesOnly: false,
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
      },
      4: {
        ...controls.moveCategory,
        statusMovesOnly: false,
        sameMoveType: true,
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
      },
    },
  },
  pokedexCategories: {
    rendering: renderings.pokedexCategories,
    levels: {
      2: {
        ...controls.pokedexCategories,
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
      },
      3: {
        ...controls.pokedexCategories,
        sameColorOrShape: true,
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
      },
      5: {
        ...controls.pokedexCategories,
        sameColorOrShape: true,
        closeAlternatives: true,
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
      },
    },
  },
  evolutionConditions: {
    rendering: renderings.evolutionConditions,
    levels: {
      3: {
        ...controls.evolutionConditions,
        minimumEvolutionConditions: 1,
        mixedLevelEvolutionConditions: true,
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
      },
      4: {
        ...controls.evolutionConditions,
        minimumEvolutionConditions: 1,
        mixedLevelEvolutionConditions: true,
        evolutionLocations: true,
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
      },
      5: {
        ...controls.evolutionConditions,
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
  abilityEffects: {
    rendering: renderings.abilityEffects,
    levels: {
      3: {
        ...controls.abilityEffects,
        minimumEffectSimilarity: 0,
        maximumEffectSimilarity: 0.35,
        preferSimilarEffects: false,
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
      },
      4: {
        ...controls.abilityEffects,
        minimumEffectSimilarity: 0,
        maximumEffectSimilarity: 0.35,
        preferSimilarEffects: true,
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
      },
      5: {
        ...controls.abilityEffects,
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
  heldItemEffects: {
    rendering: renderings.heldItemEffects,
    levels: {
      3: {
        ...controls.heldItemEffects,
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
        ...controls.heldItemEffects,
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
        ...controls.heldItemEffects,
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
  hiddenAbilities: {
    rendering: renderings.hiddenAbilities,
    levels: {
      4: {
        ...controls.hiddenAbilities,
        sameTypeAbilityDistractors: false,
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
      },
      5: {
        ...controls.hiddenAbilities,
        sameTypeAbilityDistractors: true,
        allowMissingSprites: true,
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
      },
    },
  },
  natureEffects: {
    rendering: renderings.natureEffects,
    levels: {
      4: {
        ...controls.natureEffects,
        shareNatureStat: false,
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
      },
      5: {
        ...controls.natureEffects,
        shareNatureStat: true,
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
      },
    },
  },
  evYields: {
    rendering: renderings.evYields,
    levels: {
      4: {
        ...controls.evYields,
        completeEvYield: false,
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
      },
      5: {
        ...controls.evYields,
        completeEvYield: true,
        closeAlternatives: true,
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
      },
    },
  },
  encounterLocations: {
    rendering: renderings.encounterLocations,
    levels: {
      4: {
        ...controls.encounterLocations,
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
      },
      5: {
        ...controls.encounterLocations,
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
  berryFlavors: {
    rendering: renderings.berryFlavors,
    levels: {
      4: {
        ...controls.berryFlavors,
        completeFlavors: false,
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
      },
      5: {
        ...controls.berryFlavors,
        completeFlavors: true,
        response: {
          kind: 'choices',
          minimumOptions: 2,
        },
      },
    },
  },
  naturalGift: {
    rendering: renderings.naturalGift,
    levels: {
      5: {
        ...controls.naturalGift,
        response: {
          kind: 'choices',
          minimumOptions: 2,
        },
      },
    },
  },
  pokemonFromHistoricalSprite: {
    rendering: renderings.pokemonFromHistoricalSprite,
    unleveled: {
      ...controls.pokemonFromHistoricalSprite,
      response: {
        kind: 'choices',
        minimumOptions: 4,
      },
    },
    levels: {
      1: {
        ...controls.pokemonFromHistoricalSprite,
        currentSpriteChance: 1,
        distractorRankDirection: 'least-similar',
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
      },
      2: {
        ...controls.pokemonFromHistoricalSprite,
        currentSpriteChance: 1,
        distractorRankDirection: 'most-similar',
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
      },
      4: {
        ...controls.pokemonFromHistoricalSprite,
        distractorRankDirection: 'most-similar',
        distractorPoolSize: 6,
        smallPoolPolicy: 'fixed-size',
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
      },
      5: {
        ...controls.pokemonFromHistoricalSprite,
        response: {
          kind: 'search',
          candidates: 'pool',
        },
        backSpriteChance: 1,
      },
    },
  },
  spriteForPokemon: {
    rendering: renderings.spriteForPokemon,
    unleveled: {
      ...controls.spriteForPokemon,
      response: {
        kind: 'choices',
        minimumOptions: 4,
      },
    },
    levels: {
      1: {
        ...controls.spriteForPokemon,
        distractorRankDirection: 'least-similar',
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
      },
      3: {
        ...controls.spriteForPokemon,
        distractorRankDirection: 'most-similar',
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
      },
      4: {
        ...controls.spriteForPokemon,
        distractorRankDirection: 'most-similar',
        distractorPoolSize: 6,
        smallPoolPolicy: 'fixed-size',
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
      },
      5: {
        ...controls.spriteForPokemon,
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
  silhouetteForPokemon: {
    rendering: renderings.silhouetteForPokemon,
    unleveled: {
      ...controls.silhouetteForPokemon,
      response: {
        kind: 'choices',
        minimumOptions: 4,
      },
    },
    levels: {
      2: {
        ...controls.silhouetteForPokemon,
        distractorRankDirection: 'least-similar',
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
      },
      4: {
        ...controls.silhouetteForPokemon,
        distractorRankDirection: 'most-similar',
        distractorPoolSize: 6,
        smallPoolPolicy: 'fixed-size',
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
      },
      5: {
        ...controls.silhouetteForPokemon,
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
  pokemonFromSilhouette: {
    rendering: renderings.pokemonFromSilhouette,
    unleveled: {
      ...controls.pokemonFromSilhouette,
      response: {
        kind: 'choices',
        minimumOptions: 4,
      },
    },
    levels: {
      2: {
        ...controls.pokemonFromSilhouette,
        distractorRankDirection: 'least-similar',
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
      },
      3: {
        ...controls.pokemonFromSilhouette,
        distractorRankDirection: 'most-similar',
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
      },
      5: {
        ...controls.pokemonFromSilhouette,
        response: {
          kind: 'search',
          candidates: 'pool',
        },
      },
    },
  },
  pokemonFromPixelCrop: {
    rendering: renderings.pokemonFromPixelCrop,
    unleveled: {
      ...controls.pokemonFromPixelCrop,
      response: {
        kind: 'choices',
        minimumOptions: 4,
      },
    },
    levels: {
      3: {
        ...controls.pokemonFromPixelCrop,
        cropScale: 0.65,
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
      },
      4: {
        ...controls.pokemonFromPixelCrop,
        distractorRankDirection: 'most-similar',
        distractorPoolSize: 6,
        smallPoolPolicy: 'fixed-size',
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
      },
      5: {
        ...controls.pokemonFromPixelCrop,
        response: {
          kind: 'search',
          candidates: 'pool',
        },
        cropScale: 1.4,
      },
    },
  },
  shinyPokemonIdentification: {
    rendering: renderings.shinyPokemonIdentification,
    unleveled: {
      ...controls.shinyPokemonIdentification,
      response: {
        kind: 'choices',
        minimumOptions: 4,
      },
    },
    levels: {
      3: {
        ...controls.shinyPokemonIdentification,
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
      },
      4: {
        ...controls.shinyPokemonIdentification,
        distractorRankDirection: 'most-similar',
        distractorPoolSize: 6,
        smallPoolPolicy: 'fixed-size',
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
      },
      5: {
        ...controls.shinyPokemonIdentification,
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
  pokedexEntryMatch: {
    rendering: renderings.pokedexEntryMatch,
    unleveled: {
      ...controls.pokedexEntryMatch,
      response: {
        kind: 'choices',
        minimumOptions: 4,
      },
    },
    levels: {
      2: {
        ...controls.pokedexEntryMatch,
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
      },
      4: {
        ...controls.pokedexEntryMatch,
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
  pokemonTypes: {
    rendering: renderings.pokemonTypes,
    unleveled: {
      ...controls.pokemonTypes,
      response: {
        kind: 'choices',
        minimumOptions: 4,
      },
    },
    levels: {
      2: {
        ...controls.pokemonTypes,
        singleType: true,
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
      },
      3: {
        ...controls.pokemonTypes,
        response: {
          kind: 'type-grid',
          correct: 'subject-types',
        },
      },
    },
  },
  typeOddOneOut: {
    rendering: renderings.typeOddOneOut,
    unleveled: {
      ...controls.typeOddOneOut,
      response: {
        kind: 'choices',
        minimumOptions: 4,
      },
    },
    levels: {
      2: {
        ...controls.typeOddOneOut,
        singleType: true,
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
      },
      3: {
        ...controls.typeOddOneOut,
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
      },
    },
  },
  pokemonByType: {
    rendering: renderings.pokemonByType,
    unleveled: {
      ...controls.pokemonByType,
      response: {
        kind: 'choices',
        minimumOptions: 4,
      },
    },
    levels: {
      2: {
        ...controls.pokemonByType,
        singleType: true,
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
      },
      3: {
        ...controls.pokemonByType,
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
      },
    },
  },
  dualTypeMatch: {
    rendering: renderings.dualTypeMatch,
    unleveled: {
      ...controls.dualTypeMatch,
      response: {
        kind: 'choices',
        minimumOptions: 4,
      },
    },
    levels: {
      3: {
        ...controls.dualTypeMatch,
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
      },
    },
  },
  legendaryMythicalSelection: {
    rendering: renderings.legendaryMythicalSelection,
    unleveled: {
      ...controls.legendaryMythicalSelection,
      response: {
        kind: 'choices',
        minimumOptions: 4,
      },
    },
    levels: {
      2: {
        ...controls.legendaryMythicalSelection,
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
      },
    },
  },
  pokemonByGeneration: {
    rendering: renderings.pokemonByGeneration,
    unleveled: {
      ...controls.pokemonByGeneration,
      response: {
        kind: 'choices',
        minimumOptions: 4,
      },
    },
    levels: {
      2: {
        ...controls.pokemonByGeneration,
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
      },
    },
  },
  evolutionChain: {
    rendering: renderings.evolutionChain,
    unleveled: {
      ...controls.evolutionChain,
      response: {
        kind: 'choices',
        minimumOptions: 4,
      },
    },
    levels: {
      2: {
        ...controls.evolutionChain,
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
      },
      4: {
        ...controls.evolutionChain,
        response: {
          kind: 'search',
          candidates: 'pool',
        },
      },
    },
  },
  evolutionGainedType: {
    rendering: renderings.evolutionGainedType,
    unleveled: {
      ...controls.evolutionGainedType,
      response: {
        kind: 'choices',
        minimumOptions: 4,
      },
    },
    levels: {
      3: {
        ...controls.evolutionGainedType,
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
      },
      5: {
        ...controls.evolutionGainedType,
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
  pokemonAbilities: {
    rendering: renderings.pokemonAbilities,
    unleveled: {
      ...controls.pokemonAbilities,
      response: {
        kind: 'choices',
        minimumOptions: 4,
      },
    },
    levels: {
      3: {
        ...controls.pokemonAbilities,
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
      },
      5: {
        ...controls.pokemonAbilities,
        plausibleProperties: true,
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
      },
    },
  },
  levelUpMoves: {
    rendering: renderings.levelUpMoves,
    unleveled: {
      ...controls.levelUpMoves,
      response: {
        kind: 'choices',
        minimumOptions: 4,
      },
    },
    levels: {
      4: {
        ...controls.levelUpMoves,
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
      },
      5: {
        ...controls.levelUpMoves,
        plausibleProperties: true,
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
      },
    },
  },
  statExtremes: {
    rendering: renderings.statExtremes,
    unleveled: {
      ...controls.statExtremes,
      response: {
        kind: 'choices',
        minimumOptions: 4,
      },
    },
    levels: {
      3: {
        ...controls.statExtremes,
        statGap: [41, Infinity],
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
      },
      4: {
        ...controls.statExtremes,
        statGap: [21, 40],
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
      },
      5: {
        ...controls.statExtremes,
        statGap: [10, 20],
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
      },
    },
  },
  typeMatchup: {
    rendering: renderings.typeMatchup,
    unleveled: {
      ...controls.typeMatchup,
      response: {
        kind: 'choices',
        minimumOptions: 4,
      },
    },
    levels: {
      1: {
        ...controls.typeMatchup,
        singleType: true,
        showTypes: true,
        multipliers: [2],
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
      },
      2: {
        ...controls.typeMatchup,
        singleType: true,
        multipliers: [2],
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
      },
      3: {
        ...controls.typeMatchup,
        showTypes: true,
        multipliers: [2, 4],
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
      },
      4: {
        ...controls.typeMatchup,
        multipliers: [0.25, 0.5, 2, 4],
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
      },
      5: {
        ...controls.typeMatchup,
        response: {
          kind: 'type-grid',
          correct: 'effectiveness',
        },
        multipliers: [0, 0.25, 0.5, 1, 2, 4],
      },
    },
  },
  superEffectiveAttacker: {
    rendering: renderings.superEffectiveAttacker,
    unleveled: {
      ...controls.superEffectiveAttacker,
      response: {
        kind: 'choices',
        minimumOptions: 4,
      },
    },
    levels: {
      2: {
        ...controls.superEffectiveAttacker,
        singleType: true,
        showTypes: true,
        multipliers: [2],
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
      },
      3: {
        ...controls.superEffectiveAttacker,
        showTypes: true,
        multipliers: [2, 4],
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
        rendering: { subject: { types: 'after-answer' } },
      },
      4: {
        ...controls.superEffectiveAttacker,
        multipliers: [0.25, 0.5, 2, 4],
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
      },
      5: {
        ...controls.superEffectiveAttacker,
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
