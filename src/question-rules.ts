import type { DifficultyRules } from './domain/quiz/difficulty.ts';
import {
  type EntityRendering,
  type QuestionRendering,
  type SpriteRendering,
  type Visibility,
} from './domain/quiz/question-rendering.ts';
import type { FamilyRules } from './domain/quiz/questions/family-rules.ts';

type Renderable<Fields extends keyof EntityRendering> = Partial<
  Pick<EntityRendering, Fields>
>;
type HiddenUntilAnswer = 'after-answer' | 'never';
type VisibleChoice = Extract<Visibility, 'always'>;
type VisibleChoiceSprite = Exclude<SpriteRendering, null> & {
  reveal: 'always';
  source: 'front' | 'all';
};
type ItemSprite = Exclude<SpriteRendering, null> & {
  silhouette: false;
  source?: never;
};
type VisibleItem =
  | {
      name?: Exclude<Visibility, 'never'>;
      sprite?: ItemSprite;
    }
  | { name: VisibleChoice; sprite?: ItemSprite | null }
  | { name?: Visibility; sprite: ItemSprite & { reveal: 'always' } };
type ItemChoices = Partial<Pick<EntityRendering, 'name' | 'sprite'>> &
  (
    | { name: VisibleChoice; sprite?: ItemSprite | null }
    | { sprite: ItemSprite & { reveal: 'always' } }
  );
type PokemonChoices = Partial<EntityRendering> &
  (
    | { sprite: VisibleChoiceSprite }
    | { name: VisibleChoice }
    | { number: VisibleChoice }
    | { types: VisibleChoice }
  );
type PokemonSearch = Renderable<'sprite' | 'number' | 'types'>;
type RequiredSubjectSprite = Omit<
  Renderable<'sprite' | 'name' | 'number' | 'types'>,
  'sprite'
> & { sprite?: VisibleChoiceSprite };
type FrontSubjectSprite = Omit<RequiredSubjectSprite, 'sprite'> & {
  sprite?: VisibleChoiceSprite & { source: 'front' };
};
type FrontPokemonChoices = Partial<Omit<EntityRendering, 'sprite'>> & {
  sprite?: (VisibleChoiceSprite & { source: 'front' }) | null;
} & (
    | { sprite: VisibleChoiceSprite & { source: 'front' } }
    | { name: VisibleChoice }
    | { number: VisibleChoice }
    | { types: VisibleChoice }
  );
type HiddenPokemonSubject = {
  name?: HiddenUntilAnswer;
  number?: HiddenUntilAnswer;
  types?: HiddenUntilAnswer;
  sprite?:
    | (Exclude<SpriteRendering, null> & {
        reveal: 'after-answer';
      })
    | null;
};

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
  itemIdentification: {
    subject?: VisibleItem;
    choices?: ItemChoices;
    search?: { sprite?: ItemSprite | null };
  };
  itemUses: { subject?: VisibleItem };
  abilityEffects: RenderingControls<'sprite'>;
  heldItemEffects: { subject?: VisibleItem };
  hiddenAbilities: RenderingControls<'sprite' | 'name' | 'number' | 'types'>;
  evYields: RenderingControls<'sprite' | 'name' | 'number' | 'types'>;
  berryFlavors: { subject?: VisibleItem };
  naturalGift: { subject?: VisibleItem };
  weightComparison: { choices?: PokemonChoices };
  heightComparison: { choices?: PokemonChoices };
  pokedexCategories: { choices?: PokemonChoices };
  evolutionConditions: RenderingControls<
    never,
    never,
    'sprite' | 'name' | 'number' | 'types'
  >;
  encounterLocations: { choices?: PokemonChoices };
  shinyPokemonIdentification: { choices?: FrontPokemonChoices };
  pokedexEntryMatch: {
    subject?: HiddenPokemonSubject;
    choices?: PokemonChoices;
    search?: PokemonSearch;
  };
  legendaryMythicalSelection: { choices?: PokemonChoices };
  statExtremes: { choices?: PokemonChoices };
  pokemonFromHistoricalSprite: {
    subject?: RequiredSubjectSprite;
    choices?: PokemonChoices;
    search?: PokemonSearch;
  };
  spriteForPokemon: {
    subject?: Renderable<'sprite' | 'name' | 'number' | 'types'>;
    choices?: PokemonChoices;
  };
  silhouetteForPokemon: {
    subject?: Renderable<'sprite' | 'name' | 'number' | 'types'>;
    choices?: PokemonChoices;
  };
  pokemonFromSilhouette: {
    subject?: RequiredSubjectSprite;
    choices?: PokemonChoices;
    search?: PokemonSearch;
  };
  pokemonFromPixelCrop: {
    subject?: FrontSubjectSprite;
    choices?: PokemonChoices;
    search?: PokemonSearch;
  };
  pokemonByGeneration: { choices?: PokemonChoices };
  pokemonTypes: {
    subject?: Renderable<'sprite' | 'name' | 'number'> & {
      types?: 'after-answer';
    };
  };
  typeOddOneOut: { choices?: PokemonChoices };
  pokemonByType: { choices?: PokemonChoices };
  dualTypeMatch: {
    subject?: Renderable<'sprite' | 'name' | 'number'> & {
      types?: HiddenUntilAnswer;
    };
    choices?: PokemonChoices;
  };
  typeMatchup: RenderingControls<'sprite' | 'name' | 'number' | 'types'>;
  evolutionChain: {
    subject?: Renderable<'sprite' | 'name' | 'number' | 'types'>;
    choices?: PokemonChoices;
    related?: Renderable<'sprite' | 'name' | 'number' | 'types'>;
    search?: PokemonSearch;
  };
  evolutionGainedType: RenderingControls<
    'sprite' | 'name' | 'number' | 'types',
    never,
    'sprite' | 'name' | 'number' | 'types'
  >;
  superEffectiveAttacker: {
    subject?: Renderable<'sprite' | 'name' | 'number'> & {
      types?: 'always' | 'after-answer';
    };
    choices?: PokemonChoices;
    related?: Renderable<'sprite' | 'name' | 'number' | 'types'>;
  };
  champion: {
    subject?: Renderable<'sprite' | 'name' | 'number' | 'types'>;
    choices?: PokemonChoices;
    search?: PokemonSearch;
  };
  pokemonAbilities: RenderingControls<'sprite' | 'name' | 'number' | 'types'>;
  levelUpMoves: RenderingControls<'sprite' | 'name' | 'number' | 'types'>;
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
  Rules extends { rendering: QuestionRendering; response: { kind: string } },
  Type extends keyof FamilyRules,
> = Type extends 'pokedexEntryMatch'
  ? Omit<Rules, 'rendering' | 'response'> &
      (
        | {
            response: Extract<Rules['response'], { kind: 'search' }>;
            rendering?: RenderingControlsFor<Type>;
          }
        | {
            response: Exclude<Rules['response'], { kind: 'search' }>;
            rendering?: Omit<RenderingControlsFor<Type>, 'subject'>;
          }
      )
  : Omit<Rules, 'rendering'> & {
      /** Visibility changes applied after the family policy. */
      rendering?: RenderingControlsFor<Type>;
    };

/**
 * One family's rules. Numeric `levels` may be sparse; resolution selects the
 * highest defined level at or below the requested difficulty.
 */
export type QuestionRuleRow<
  Rules extends { rendering: QuestionRendering; response: { kind: string } },
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
    view: { answer: { kind: 'item' } },
    distinctItemCategories: false,
    sameItemPocket: false,
    sameItemCategory: false,
    machineDiscChance: 0,
  },
  itemUses: {
    view: { answer: { kind: 'text' } },
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
    view: { answer: { kind: 'text', layout: 'statements' } },
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
    view: { answer: { kind: 'text' } },
  },
  naturalGift: {
    view: { answer: { kind: 'type' } },
  },
  pokemonFromHistoricalSprite: {
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
    view: { answer: { kind: 'type' } },
    singleType: false,
  },
  typeOddOneOut: {
    view: { answer: { kind: 'pokemon' } },
    singleType: false,
  },
  pokemonByType: {
    view: { answer: { kind: 'pokemon' } },
    singleType: false,
  },
  dualTypeMatch: {
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
    view: { answer: { kind: 'type' } },
    singleType: false,
    multipliers: [4, 2, 0.5, 0.25],
  },
  superEffectiveAttacker: {
    view: {
      answer: {
        kind: 'pokemon',
        layout: 'superEffectiveAttacker',
      },
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
    multipliers: [4, 2, 0.5, 0.25],
  },
  champion: {
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
    finale: null,
  },
} as const satisfies {
  [Type in keyof FamilyRules]: Partial<
    Omit<FamilyRules[Type], 'response' | 'rendering' | 'view'>
  > & { view: FamilyRules[Type]['view'] };
};

const frontSprite = {
  reveal: 'always',
  silhouette: false,
  source: 'front',
} as const;
const itemSprite = { reveal: 'always', silhouette: false } as const;
const silhouetteSprite = { ...frontSprite, silhouette: true } as const;
const answerSprite = { ...frontSprite, reveal: 'after-answer' } as const;

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

/** Family rendering overrides, checked against each family's usable fields. */
const renderings = {
  itemIdentification: {
    subject: { name: 'never', sprite: itemSprite },
    choices: { name: 'always', sprite: null },
    search: { sprite: null },
  },
  itemUses: { subject: { sprite: itemSprite } },
  weightComparison: {},
  heightComparison: {},
  moveTypes: {},
  locationRegion: {},
  moveCategory: {},
  pokedexCategories: {},
  evolutionConditions: { related: { sprite: frontSprite } },
  abilityEffects: {},
  heldItemEffects: { subject: { sprite: itemSprite } },
  hiddenAbilities: { subject: { sprite: frontSprite } },
  natureEffects: {},
  evYields: { subject: { sprite: frontSprite } },
  encounterLocations: {},
  berryFlavors: { subject: { sprite: itemSprite } },
  naturalGift: { subject: { sprite: itemSprite } },
  pokemonFromHistoricalSprite: {
    subject: {
      sprite: { ...frontSprite, source: 'all' },
      name: 'after-answer',
      number: 'after-answer',
    },
    choices: { name: 'always', sprite: null },
    search: { sprite: null },
  },
  spriteForPokemon: {
    subject: { sprite: null },
    choices: {
      sprite: frontSprite,
      name: 'after-answer',
      number: 'after-answer',
    },
  },
  silhouetteForPokemon: {
    subject: { sprite: null },
    choices: {
      sprite: silhouetteSprite,
      name: 'after-answer',
      number: 'after-answer',
    },
  },
  pokemonFromSilhouette: {
    subject: {
      sprite: silhouetteSprite,
      name: 'after-answer',
      number: 'after-answer',
    },
    choices: { name: 'always', sprite: null },
    search: { sprite: null },
  },
  pokemonFromPixelCrop: {
    subject: {
      sprite: frontSprite,
      name: 'after-answer',
      number: 'after-answer',
    },
    choices: { name: 'always', sprite: null },
    search: { sprite: null },
  },
  shinyPokemonIdentification: {},
  pokedexEntryMatch: {
    subject: { name: 'never', number: 'never' },
  },
  pokemonTypes: {
    subject: { sprite: frontSprite, types: 'after-answer' },
  },
  typeOddOneOut: { choices: { name: 'always', types: 'after-answer' } },
  pokemonByType: { choices: { name: 'always', types: 'after-answer' } },
  dualTypeMatch: {
    subject: { sprite: frontSprite, types: 'after-answer' },
    choices: { name: 'always', types: 'after-answer' },
  },
  legendaryMythicalSelection: {},
  pokemonByGeneration: {
    choices: { name: 'always', number: 'after-answer' },
  },
  evolutionChain: {
    subject: {
      sprite: answerSprite,
      name: 'after-answer',
      number: 'after-answer',
    },
    choices: { name: 'always', sprite: null, number: 'never' },
    related: { sprite: frontSprite },
    search: { sprite: null },
  },
  evolutionGainedType: {
    subject: { sprite: frontSprite, types: 'always' },
    related: {
      sprite: answerSprite,
      name: 'after-answer',
      number: 'after-answer',
      types: 'always',
    },
  },
  pokemonAbilities: { subject: { sprite: frontSprite } },
  levelUpMoves: { subject: { sprite: frontSprite } },
  statExtremes: {},
  typeMatchup: {
    subject: { sprite: frontSprite, types: 'after-answer' },
  },
  superEffectiveAttacker: {
    subject: { sprite: frontSprite, types: 'after-answer' },
    related: { sprite: answerSprite, name: 'never', number: 'never' },
    choices: { name: 'always', types: 'after-answer' },
  },
  champion: {
    subject: {
      sprite: {
        ...silhouetteSprite,
        reveal: { afterClues: 4 },
      },
      name: 'after-answer',
      number: 'after-answer',
    },
    choices: {
      sprite: null,
      name: 'always',
      number: 'after-answer',
      types: 'after-answer',
    },
    search: { sprite: null, number: 'never' },
  },
} satisfies { [Type in keyof FamilyRules]: RenderingControlsFor<Type> };

const responsePresets = {
  single: { kind: 'choices', selection: 'single', minimumOptions: 4 },
  shortSingle: { kind: 'choices', selection: 'single', minimumOptions: 2 },
  multi: { kind: 'choices', selection: 'multi', minimumOptions: 4 },
  shortMulti: { kind: 'choices', selection: 'multi', minimumOptions: 2 },
  adaptive: { kind: 'choices', selection: 'adaptive', minimumOptions: 4 },
} as const;

/** Source of leveled and unleveled builder configuration for every family. */
export const questionRules = {
  itemIdentification: {
    rendering: renderings.itemIdentification,
    levels: {
      1: {
        ...controls.itemIdentification,
        distinctItemCategories: true,
        response: responsePresets.single,
      },
      2: {
        ...controls.itemIdentification,
        sameItemPocket: true,
        response: responsePresets.single,
      },
      3: {
        ...controls.itemIdentification,
        sameItemCategory: true,
        response: responsePresets.single,
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
        response: responsePresets.single,
      },
      3: {
        ...controls.itemUses,
        sameItemCategory: true,
        minimumEffectSimilarity: 0,
        maximumEffectSimilarity: 0.8,
        preferSimilarEffects: false,
        response: responsePresets.single,
      },
      4: {
        ...controls.itemUses,
        sameItemCategory: true,
        minimumEffectSimilarity: 0.3,
        maximumEffectSimilarity: 0.8,
        preferSimilarEffects: true,
        response: responsePresets.single,
      },
      5: {
        ...controls.itemUses,
        sameItemCategory: true,
        minimumEffectSimilarity: 0.5,
        maximumEffectSimilarity: 0.8,
        preferSimilarEffects: true,
        useFullEffectText: true,
        allowMissingSprites: true,
        response: responsePresets.single,
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
        response: responsePresets.single,
      },
      3: {
        ...controls.weightComparison,
        measurement: {
          minimumRatio: 1.3,
          maximumRatio: Infinity,
          maximumSpread: Infinity,
        },
        response: responsePresets.single,
      },
      4: {
        ...controls.weightComparison,
        measurement: {
          minimumRatio: 1.3,
          maximumRatio: 2,
          maximumSpread: 2,
        },
        response: responsePresets.single,
      },
      5: {
        ...controls.weightComparison,
        measurement: {
          minimumRatio: 1.3,
          maximumRatio: 1.5,
          maximumSpread: 1.5,
        },
        response: responsePresets.single,
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
        response: responsePresets.single,
      },
      3: {
        ...controls.heightComparison,
        measurement: {
          minimumRatio: 1.3,
          maximumRatio: Infinity,
          maximumSpread: Infinity,
        },
        response: responsePresets.single,
      },
      4: {
        ...controls.heightComparison,
        measurement: {
          minimumRatio: 1.3,
          maximumRatio: 2,
          maximumSpread: 2,
        },
        response: responsePresets.single,
      },
      5: {
        ...controls.heightComparison,
        measurement: {
          minimumRatio: 1.3,
          maximumRatio: 1.5,
          maximumSpread: 1.5,
        },
        response: responsePresets.single,
      },
    },
  },
  moveTypes: {
    rendering: renderings.moveTypes,
    levels: {
      2: {
        ...controls.moveTypes,
        showMoveDescription: true,
        response: responsePresets.single,
      },
      3: {
        ...controls.moveTypes,
        allOptions: true,
        excludeTypeHintNames: true,
        response: responsePresets.shortSingle,
      },
    },
  },
  locationRegion: {
    rendering: renderings.locationRegion,
    levels: {
      2: {
        ...controls.locationRegion,
        response: responsePresets.single,
      },
      3: {
        ...controls.locationRegion,
        allOptions: true,
        response: responsePresets.shortSingle,
      },
    },
  },
  moveCategory: {
    rendering: renderings.moveCategory,
    levels: {
      2: {
        ...controls.moveCategory,
        statusMovesOnly: true,
        response: responsePresets.single,
      },
      3: {
        ...controls.moveCategory,
        statusMovesOnly: false,
        response: responsePresets.single,
      },
      4: {
        ...controls.moveCategory,
        statusMovesOnly: false,
        sameMoveType: true,
        response: responsePresets.single,
      },
    },
  },
  pokedexCategories: {
    rendering: renderings.pokedexCategories,
    levels: {
      2: {
        ...controls.pokedexCategories,
        response: responsePresets.single,
      },
      3: {
        ...controls.pokedexCategories,
        sameColorOrShape: true,
        response: responsePresets.single,
      },
      5: {
        ...controls.pokedexCategories,
        sameColorOrShape: true,
        closeAlternatives: true,
        response: responsePresets.single,
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
        response: responsePresets.single,
      },
      4: {
        ...controls.evolutionConditions,
        minimumEvolutionConditions: 1,
        mixedLevelEvolutionConditions: true,
        evolutionLocations: true,
        response: responsePresets.single,
      },
      5: {
        ...controls.evolutionConditions,
        minimumEvolutionConditions: 2,
        exactEvolutionValues: true,
        compactEvolutionLabels: true,
        exactLevelQuestionChance: 0.2,
        directEvolutionItems: true,
        evolutionLocations: true,
        preferCloseConditionValues: true,
        response: responsePresets.adaptive,
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
        response: responsePresets.single,
      },
      4: {
        ...controls.abilityEffects,
        minimumEffectSimilarity: 0,
        maximumEffectSimilarity: 0.35,
        preferSimilarEffects: true,
        response: responsePresets.single,
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
        response: responsePresets.single,
      },
      4: {
        ...controls.heldItemEffects,
        sameItemCategory: true,
        minimumEffectSimilarity: 0.3,
        maximumEffectSimilarity: 0.8,
        preferSimilarEffects: true,
        response: responsePresets.single,
      },
      5: {
        ...controls.heldItemEffects,
        sameItemCategory: true,
        minimumEffectSimilarity: 0.5,
        maximumEffectSimilarity: 0.8,
        preferSimilarEffects: true,
        useFullEffectText: true,
        allowMissingSprites: true,
        response: responsePresets.single,
      },
    },
  },
  hiddenAbilities: {
    rendering: renderings.hiddenAbilities,
    levels: {
      4: {
        ...controls.hiddenAbilities,
        sameTypeAbilityDistractors: false,
        response: responsePresets.single,
      },
      5: {
        ...controls.hiddenAbilities,
        sameTypeAbilityDistractors: true,
        allowMissingSprites: true,
        response: responsePresets.single,
      },
    },
  },
  natureEffects: {
    rendering: renderings.natureEffects,
    levels: {
      4: {
        ...controls.natureEffects,
        shareNatureStat: false,
        response: responsePresets.single,
      },
      5: {
        ...controls.natureEffects,
        shareNatureStat: true,
        response: responsePresets.single,
      },
    },
  },
  evYields: {
    rendering: renderings.evYields,
    levels: {
      4: {
        ...controls.evYields,
        completeEvYield: false,
        response: responsePresets.single,
      },
      5: {
        ...controls.evYields,
        completeEvYield: true,
        closeAlternatives: true,
        response: responsePresets.single,
      },
    },
  },
  encounterLocations: {
    rendering: renderings.encounterLocations,
    levels: {
      4: {
        ...controls.encounterLocations,
        response: responsePresets.single,
      },
      5: {
        ...controls.encounterLocations,
        encounterConditions: true,
        closeAlternatives: true,
        response: responsePresets.multi,
      },
    },
  },
  berryFlavors: {
    rendering: renderings.berryFlavors,
    levels: {
      4: {
        ...controls.berryFlavors,
        response: responsePresets.single,
      },
      5: {
        ...controls.berryFlavors,
        response: responsePresets.shortMulti,
      },
    },
  },
  naturalGift: {
    rendering: renderings.naturalGift,
    levels: {
      5: {
        ...controls.naturalGift,
        response: responsePresets.shortSingle,
      },
    },
  },
  pokemonFromHistoricalSprite: {
    rendering: renderings.pokemonFromHistoricalSprite,
    unleveled: {
      ...controls.pokemonFromHistoricalSprite,
      response: responsePresets.single,
    },
    levels: {
      1: {
        ...controls.pokemonFromHistoricalSprite,
        currentSpriteChance: 1,
        distractorRankDirection: 'least-similar',
        response: responsePresets.single,
      },
      2: {
        ...controls.pokemonFromHistoricalSprite,
        currentSpriteChance: 1,
        distractorRankDirection: 'most-similar',
        response: responsePresets.single,
      },
      4: {
        ...controls.pokemonFromHistoricalSprite,
        distractorRankDirection: 'most-similar',
        distractorPoolSize: 6,
        smallPoolPolicy: 'fixed-size',
        response: responsePresets.single,
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
      response: responsePresets.single,
    },
    levels: {
      1: {
        ...controls.spriteForPokemon,
        distractorRankDirection: 'least-similar',
        response: responsePresets.single,
      },
      3: {
        ...controls.spriteForPokemon,
        distractorRankDirection: 'most-similar',
        response: responsePresets.single,
      },
      4: {
        ...controls.spriteForPokemon,
        distractorRankDirection: 'most-similar',
        distractorPoolSize: 6,
        smallPoolPolicy: 'fixed-size',
        response: responsePresets.single,
      },
      5: {
        ...controls.spriteForPokemon,
        distractorRankDirection: 'most-similar',
        distractorPoolSize: 3,
        smallPoolPolicy: 'fixed-size',
        response: responsePresets.single,
      },
    },
  },
  silhouetteForPokemon: {
    rendering: renderings.silhouetteForPokemon,
    unleveled: {
      ...controls.silhouetteForPokemon,
      response: responsePresets.single,
    },
    levels: {
      2: {
        ...controls.silhouetteForPokemon,
        distractorRankDirection: 'least-similar',
        response: responsePresets.single,
      },
      4: {
        ...controls.silhouetteForPokemon,
        distractorRankDirection: 'most-similar',
        distractorPoolSize: 6,
        smallPoolPolicy: 'fixed-size',
        response: responsePresets.single,
      },
      5: {
        ...controls.silhouetteForPokemon,
        distractorRankDirection: 'most-similar',
        distractorPoolSize: 3,
        smallPoolPolicy: 'fixed-size',
        response: responsePresets.single,
      },
    },
  },
  pokemonFromSilhouette: {
    rendering: renderings.pokemonFromSilhouette,
    unleveled: {
      ...controls.pokemonFromSilhouette,
      response: responsePresets.single,
    },
    levels: {
      2: {
        ...controls.pokemonFromSilhouette,
        distractorRankDirection: 'least-similar',
        response: responsePresets.single,
      },
      3: {
        ...controls.pokemonFromSilhouette,
        distractorRankDirection: 'most-similar',
        response: responsePresets.single,
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
      response: responsePresets.single,
    },
    levels: {
      3: {
        ...controls.pokemonFromPixelCrop,
        cropScale: 0.65,
        response: responsePresets.single,
      },
      4: {
        ...controls.pokemonFromPixelCrop,
        distractorRankDirection: 'most-similar',
        distractorPoolSize: 6,
        smallPoolPolicy: 'fixed-size',
        response: responsePresets.single,
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
      response: responsePresets.single,
    },
    levels: {
      3: {
        ...controls.shinyPokemonIdentification,
        response: responsePresets.single,
      },
      4: {
        ...controls.shinyPokemonIdentification,
        distractorRankDirection: 'most-similar',
        distractorPoolSize: 6,
        smallPoolPolicy: 'fixed-size',
        response: responsePresets.single,
      },
      5: {
        ...controls.shinyPokemonIdentification,
        distractorRankDirection: 'most-similar',
        distractorPoolSize: 3,
        smallPoolPolicy: 'fixed-size',
        response: responsePresets.single,
      },
    },
  },
  pokedexEntryMatch: {
    rendering: renderings.pokedexEntryMatch,
    unleveled: {
      ...controls.pokedexEntryMatch,
      response: responsePresets.single,
    },
    levels: {
      2: {
        ...controls.pokedexEntryMatch,
        response: responsePresets.single,
      },
      4: {
        ...controls.pokedexEntryMatch,
        response: {
          kind: 'search',
          candidates: 'pool',
        },
        rendering: {
          subject: {
            sprite: answerSprite,
            name: 'after-answer',
            number: 'after-answer',
          },
        },
      },
    },
  },
  pokemonTypes: {
    rendering: renderings.pokemonTypes,
    unleveled: {
      ...controls.pokemonTypes,
      response: responsePresets.single,
    },
    levels: {
      2: {
        ...controls.pokemonTypes,
        singleType: true,
        response: responsePresets.single,
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
      response: responsePresets.single,
    },
    levels: {
      2: {
        ...controls.typeOddOneOut,
        singleType: true,
        response: responsePresets.single,
      },
      3: {
        ...controls.typeOddOneOut,
        response: responsePresets.single,
      },
    },
  },
  pokemonByType: {
    rendering: renderings.pokemonByType,
    unleveled: {
      ...controls.pokemonByType,
      response: responsePresets.multi,
    },
    levels: {
      2: {
        ...controls.pokemonByType,
        singleType: true,
        response: responsePresets.multi,
      },
      3: {
        ...controls.pokemonByType,
        response: responsePresets.multi,
      },
    },
  },
  dualTypeMatch: {
    rendering: renderings.dualTypeMatch,
    unleveled: {
      ...controls.dualTypeMatch,
      response: responsePresets.single,
    },
    levels: {
      3: {
        ...controls.dualTypeMatch,
        response: responsePresets.single,
      },
    },
  },
  legendaryMythicalSelection: {
    rendering: renderings.legendaryMythicalSelection,
    unleveled: {
      ...controls.legendaryMythicalSelection,
      response: responsePresets.multi,
    },
    levels: {
      2: {
        ...controls.legendaryMythicalSelection,
        response: responsePresets.multi,
      },
    },
  },
  pokemonByGeneration: {
    rendering: renderings.pokemonByGeneration,
    unleveled: {
      ...controls.pokemonByGeneration,
      response: responsePresets.multi,
    },
    levels: {
      2: {
        ...controls.pokemonByGeneration,
        response: responsePresets.multi,
      },
    },
  },
  evolutionChain: {
    rendering: renderings.evolutionChain,
    unleveled: {
      ...controls.evolutionChain,
      response: responsePresets.single,
    },
    levels: {
      2: {
        ...controls.evolutionChain,
        response: responsePresets.single,
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
      response: responsePresets.single,
    },
    levels: {
      3: {
        ...controls.evolutionGainedType,
        response: responsePresets.single,
      },
      5: {
        ...controls.evolutionGainedType,
        response: responsePresets.single,
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
      response: responsePresets.single,
    },
    levels: {
      3: {
        ...controls.pokemonAbilities,
        response: responsePresets.single,
      },
      5: {
        ...controls.pokemonAbilities,
        plausibleProperties: true,
        response: responsePresets.single,
      },
    },
  },
  levelUpMoves: {
    rendering: renderings.levelUpMoves,
    unleveled: {
      ...controls.levelUpMoves,
      response: responsePresets.single,
    },
    levels: {
      4: {
        ...controls.levelUpMoves,
        response: responsePresets.single,
      },
      5: {
        ...controls.levelUpMoves,
        plausibleProperties: true,
        response: responsePresets.single,
      },
    },
  },
  statExtremes: {
    rendering: renderings.statExtremes,
    unleveled: {
      ...controls.statExtremes,
      response: responsePresets.single,
    },
    levels: {
      3: {
        ...controls.statExtremes,
        statGap: [41, Infinity],
        response: responsePresets.single,
      },
      4: {
        ...controls.statExtremes,
        statGap: [21, 40],
        response: responsePresets.single,
      },
      5: {
        ...controls.statExtremes,
        statGap: [10, 20],
        response: responsePresets.single,
      },
    },
  },
  typeMatchup: {
    rendering: renderings.typeMatchup,
    unleveled: {
      ...controls.typeMatchup,
      response: responsePresets.single,
    },
    levels: {
      1: {
        ...controls.typeMatchup,
        singleType: true,
        rendering: { subject: { types: 'always' } },
        multipliers: [2],
        response: responsePresets.single,
      },
      2: {
        ...controls.typeMatchup,
        singleType: true,
        multipliers: [2],
        response: responsePresets.single,
      },
      3: {
        ...controls.typeMatchup,
        rendering: { subject: { types: 'always' } },
        multipliers: [2, 4],
        response: responsePresets.single,
      },
      4: {
        ...controls.typeMatchup,
        multipliers: [0.25, 0.5, 2, 4],
        response: responsePresets.single,
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
      response: responsePresets.single,
    },
    levels: {
      2: {
        ...controls.superEffectiveAttacker,
        singleType: true,
        rendering: {
          subject: { types: 'always' },
          choices: { types: 'always' },
        },
        multipliers: [2],
        response: responsePresets.single,
      },
      3: {
        ...controls.superEffectiveAttacker,
        multipliers: [2, 4],
        response: responsePresets.single,
        rendering: { choices: { types: 'always' } },
      },
      4: {
        ...controls.superEffectiveAttacker,
        multipliers: [0.25, 0.5, 2, 4],
        response: responsePresets.single,
      },
      5: {
        ...controls.superEffectiveAttacker,
        distractorRankDirection: 'most-similar',
        distractorPoolSize: 3,
        multipliers: [0.25, 0.5, 2, 4],
        smallPoolPolicy: 'fixed-size',
        response: responsePresets.single,
      },
    },
  },
  champion: {
    rendering: renderings['champion'],
    unleveled: {
      ...controls['champion'],
      response: responsePresets.single,
    },
    levels: {
      1: {
        ...controls['champion'],
        rendering: { choices: { types: 'always' } },
        finale: {
          opening: 'choices-types',
          assistance: false,
          penalty: 2,
        },
        response: responsePresets.single,
      },
      2: {
        ...controls['champion'],
        finale: {
          opening: 'choices',
          assistance: false,
          penalty: 1,
        },
        response: responsePresets.single,
      },
      3: {
        ...controls['champion'],
        finale: {
          opening: 'search',
          assistance: true,
          penalty: 0,
        },
        response: responsePresets.adaptive,
      },
      5: {
        ...controls['champion'],
        finale: {
          opening: 'search',
          assistance: false,
          penalty: 0,
        },
        response: responsePresets.adaptive,
      },
    },
  },
} satisfies {
  [Type in keyof FamilyRules]: QuestionRuleRow<FamilyRules[Type], Type>;
};
