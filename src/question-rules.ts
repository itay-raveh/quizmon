import type { DifficultyRules } from './domain/quiz/difficulty.ts';
import type { QuestionRendering } from './domain/quiz/question-rendering.ts';
import type { QuestionView } from './domain/quiz/question-presentation.ts';
import type { FamilyRules } from './domain/quiz/questions/family-rules.ts';

const renderings = {
  'item-identification': {
    subject: {
      sprite: 'always',
      name: 'always',
      number: 'always',
      types: 'always',
    },
    choices: {
      sprite: 'always',
      name: 'always',
      number: 'always',
      types: 'always',
    },
    related: {
      sprite: 'always',
      name: 'always',
      number: 'always',
      types: 'always',
    },
    search: {
      sprite: 'always',
      name: 'always',
      number: 'always',
      types: 'always',
    },
  },
  'pokedex-scan': {
    subject: {
      sprite: 'always',
      name: 'never',
      number: 'never',
      types: 'always',
    },
    choices: {
      sprite: 'never',
      name: 'always',
      number: 'always',
      types: 'always',
    },
    related: {
      sprite: 'always',
      name: 'always',
      number: 'always',
      types: 'always',
    },
    search: {
      sprite: 'never',
      name: 'always',
      number: 'always',
      types: 'always',
    },
  },
  'sprite-match': {
    subject: {
      sprite: 'never',
      name: 'always',
      number: 'always',
      types: 'always',
    },
    choices: {
      sprite: 'always',
      name: 'after-answer',
      number: 'after-answer',
      types: 'always',
    },
    related: {
      sprite: 'always',
      name: 'always',
      number: 'always',
      types: 'always',
    },
    search: {
      sprite: 'always',
      name: 'always',
      number: 'always',
      types: 'always',
    },
  },
  'silhouette-match': {
    subject: {
      sprite: 'never',
      name: 'always',
      number: 'always',
      types: 'always',
    },
    choices: {
      sprite: 'silhouette',
      name: 'after-answer',
      number: 'after-answer',
      types: 'always',
    },
    related: {
      sprite: 'always',
      name: 'always',
      number: 'always',
      types: 'always',
    },
    search: {
      sprite: 'always',
      name: 'always',
      number: 'always',
      types: 'always',
    },
  },
  'whos-that-pokemon': {
    subject: {
      sprite: 'silhouette',
      name: 'never',
      number: 'never',
      types: 'always',
    },
    choices: {
      sprite: 'never',
      name: 'always',
      number: 'always',
      types: 'always',
    },
    related: {
      sprite: 'always',
      name: 'always',
      number: 'always',
      types: 'always',
    },
    search: {
      sprite: 'never',
      name: 'always',
      number: 'always',
      types: 'always',
    },
  },
  'generation-roundup': {
    subject: {
      sprite: 'always',
      name: 'always',
      number: 'always',
      types: 'always',
    },
    choices: {
      sprite: 'always',
      name: 'always',
      number: 'after-answer',
      types: 'always',
    },
    related: {
      sprite: 'always',
      name: 'always',
      number: 'always',
      types: 'always',
    },
    search: {
      sprite: 'always',
      name: 'always',
      number: 'always',
      types: 'always',
    },
  },
  'evolution-link': {
    subject: {
      sprite: 'after-answer',
      name: 'after-answer',
      number: 'after-answer',
      types: 'always',
    },
    choices: {
      sprite: 'never',
      name: 'always',
      number: 'never',
      types: 'always',
    },
    related: {
      sprite: 'always',
      name: 'always',
      number: 'always',
      types: 'always',
    },
    search: {
      sprite: 'never',
      name: 'always',
      number: 'always',
      types: 'always',
    },
  },
  'evolution-shift': {
    subject: {
      sprite: 'always',
      name: 'always',
      number: 'always',
      types: 'always',
    },
    choices: {
      sprite: 'always',
      name: 'always',
      number: 'always',
      types: 'always',
    },
    related: {
      sprite: 'after-answer',
      name: 'after-answer',
      number: 'after-answer',
      types: 'always',
    },
    search: {
      sprite: 'always',
      name: 'always',
      number: 'always',
      types: 'always',
    },
  },
  'evolution-shift@5': {
    subject: {
      sprite: 'always',
      name: 'always',
      number: 'always',
      types: 'after-answer',
    },
    choices: {
      sprite: 'always',
      name: 'always',
      number: 'always',
      types: 'always',
    },
    related: {
      sprite: 'after-answer',
      name: 'after-answer',
      number: 'after-answer',
      types: 'after-answer',
    },
    search: {
      sprite: 'always',
      name: 'always',
      number: 'always',
      types: 'always',
    },
  },
  'counter-pick': {
    subject: {
      sprite: 'always',
      name: 'always',
      number: 'always',
      types: 'always',
    },
    choices: {
      sprite: 'always',
      name: 'always',
      number: 'always',
      types: 'always',
    },
    related: {
      sprite: 'after-answer',
      name: 'never',
      number: 'never',
      types: 'always',
    },
    search: {
      sprite: 'always',
      name: 'always',
      number: 'always',
      types: 'always',
    },
  },
  'counter-pick@3': {
    subject: {
      sprite: 'always',
      name: 'always',
      number: 'always',
      types: 'after-answer',
    },
    choices: {
      sprite: 'always',
      name: 'always',
      number: 'always',
      types: 'always',
    },
    related: {
      sprite: 'after-answer',
      name: 'never',
      number: 'never',
      types: 'always',
    },
    search: {
      sprite: 'always',
      name: 'always',
      number: 'always',
      types: 'always',
    },
  },
  champion: {
    subject: {
      sprite: {
        afterClues: 4,
        silhouette: true,
      },
      name: 'never',
      number: 'never',
      types: 'always',
    },
    choices: {
      sprite: 'never',
      name: 'always',
      number: 'after-answer',
      types: 'always',
    },
    related: {
      sprite: 'always',
      name: 'always',
      number: 'always',
      types: 'always',
    },
    search: {
      sprite: 'never',
      name: 'always',
      number: 'never',
      types: 'always',
    },
  },
} satisfies Record<string, QuestionRendering>;

const controls = {
  'item-identification': {
    view: { answer: { kind: 'text' } },
    distinctItemCategories: false,
    sameItemPocket: false,
    sameItemCategory: false,
    machineDiscChance: 0,
  },
  'medicine-cabinet': {
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
  'name-that-region': {
    view: { answer: { kind: 'text' } },
    allOptions: false,
  },
  'move-purpose': {
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
  'pokedex-scan': {
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
  'sprite-match': {
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
  'silhouette-match': {
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
  'whos-that-pokemon': {
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
  'pixel-peek': {
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
  'shiny-spotter': {
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
  'field-notes': {
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
  'type-check': {
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
  'odd-one-out': {
    view: { answer: { kind: 'pokemon', revealTypes: 'after-answer' } },
    singleType: false,
  },
  'type-roundup': {
    view: { answer: { kind: 'pokemon', revealTypes: 'after-answer' } },
    singleType: false,
  },
  'type-twins': {
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
  'legend-hunt': {
    view: { answer: { kind: 'pokemon' } },
  },
  'generation-roundup': {
    view: { answer: { kind: 'pokemon' } },
  },
  'evolution-link': {
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
  'evolution-shift': {
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
  'ability-check': {
    view: { answer: { kind: 'text' } },
    plausibleProperties: false,
  },
  'move-check': {
    view: { answer: { kind: 'text' } },
    plausibleProperties: false,
  },
  'stat-showdown': {
    view: { answer: { kind: 'pokemon' } },
    statGap: null,
  },
  'type-matchup': {
    view: { answer: { kind: 'type' }, subject: { types: 'after-answer' } },
    singleType: false,
    showTypes: false,
    multipliers: [4, 2, 0.5, 0.25],
  },
  'counter-pick': {
    view: {
      answer: {
        kind: 'pokemon',
        revealTypes: 'after-answer',
        layout: 'counter-pick',
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
    Omit<FamilyRules[Type], 'response' | 'rendering'>
  > & { view: QuestionView };
};

export const questionRules = {
  'item-identification': {
    levels: {
      '1': {
        ...controls['item-identification'],
        distinctItemCategories: true,
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
        rendering: renderings['item-identification'],
      },
      '2': {
        ...controls['item-identification'],
        sameItemPocket: true,
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
        rendering: renderings['item-identification'],
      },
      '3': {
        ...controls['item-identification'],
        sameItemCategory: true,
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
        rendering: renderings['item-identification'],
      },
      '4': {
        ...controls['item-identification'],
        response: { kind: 'search', candidates: 'provided' },
        rendering: renderings['item-identification'],
      },
      '5': {
        ...controls['item-identification'],
        machineDiscChance: 0.5,
        response: { kind: 'search', candidates: 'provided' },
        rendering: renderings['item-identification'],
      },
    },
  },
  'medicine-cabinet': {
    levels: {
      '2': {
        ...controls['medicine-cabinet'],
        minimumEffectSimilarity: 0,
        maximumEffectSimilarity: 0.35,
        preferSimilarEffects: false,
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
        rendering: renderings['item-identification'],
      },
      '3': {
        ...controls['medicine-cabinet'],
        sameItemCategory: true,
        minimumEffectSimilarity: 0,
        maximumEffectSimilarity: 0.8,
        preferSimilarEffects: false,
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
        rendering: renderings['item-identification'],
      },
      '4': {
        ...controls['medicine-cabinet'],
        sameItemCategory: true,
        minimumEffectSimilarity: 0.3,
        maximumEffectSimilarity: 0.8,
        preferSimilarEffects: true,
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
        rendering: renderings['item-identification'],
      },
      '5': {
        ...controls['medicine-cabinet'],
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
        rendering: renderings['item-identification'],
      },
    },
  },
  'weight-comparison': {
    levels: {
      '2': {
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
        rendering: renderings['item-identification'],
      },
      '3': {
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
        rendering: renderings['item-identification'],
      },
      '4': {
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
        rendering: renderings['item-identification'],
      },
      '5': {
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
        rendering: renderings['item-identification'],
      },
    },
  },
  'height-comparison': {
    levels: {
      '2': {
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
        rendering: renderings['item-identification'],
      },
      '3': {
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
        rendering: renderings['item-identification'],
      },
      '4': {
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
        rendering: renderings['item-identification'],
      },
      '5': {
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
        rendering: renderings['item-identification'],
      },
    },
  },
  'move-types': {
    levels: {
      '2': {
        ...controls['move-types'],
        showMoveDescription: true,
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
        rendering: renderings['item-identification'],
      },
      '3': {
        ...controls['move-types'],
        allOptions: true,
        excludeTypeHintNames: true,
        response: {
          kind: 'choices',
          minimumOptions: 2,
        },
        rendering: renderings['item-identification'],
      },
    },
  },
  'name-that-region': {
    levels: {
      '2': {
        ...controls['name-that-region'],
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
        rendering: renderings['item-identification'],
      },
      '3': {
        ...controls['name-that-region'],
        allOptions: true,
        response: {
          kind: 'choices',
          minimumOptions: 2,
        },
        rendering: renderings['item-identification'],
      },
    },
  },
  'move-purpose': {
    levels: {
      '2': {
        ...controls['move-purpose'],
        statusMovesOnly: true,
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
        rendering: renderings['item-identification'],
      },
      '3': {
        ...controls['move-purpose'],
        statusMovesOnly: false,
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
        rendering: renderings['item-identification'],
      },
      '4': {
        ...controls['move-purpose'],
        statusMovesOnly: false,
        sameMoveType: true,
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
        rendering: renderings['item-identification'],
      },
    },
  },
  'pokedex-categories': {
    levels: {
      '2': {
        ...controls['pokedex-categories'],
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
        rendering: renderings['item-identification'],
      },
      '3': {
        ...controls['pokedex-categories'],
        sameColorOrShape: true,
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
        rendering: renderings['item-identification'],
      },
      '5': {
        ...controls['pokedex-categories'],
        sameColorOrShape: true,
        closeAlternatives: true,
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
        rendering: renderings['item-identification'],
      },
    },
  },
  'evolution-conditions': {
    levels: {
      '3': {
        ...controls['evolution-conditions'],
        minimumEvolutionConditions: 1,
        mixedLevelEvolutionConditions: true,
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
        rendering: renderings['item-identification'],
      },
      '4': {
        ...controls['evolution-conditions'],
        minimumEvolutionConditions: 1,
        mixedLevelEvolutionConditions: true,
        evolutionLocations: true,
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
        rendering: renderings['item-identification'],
      },
      '5': {
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
        rendering: renderings['item-identification'],
      },
    },
  },
  'ability-effects': {
    levels: {
      '3': {
        ...controls['ability-effects'],
        minimumEffectSimilarity: 0,
        maximumEffectSimilarity: 0.35,
        preferSimilarEffects: false,
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
        rendering: renderings['item-identification'],
      },
      '4': {
        ...controls['ability-effects'],
        minimumEffectSimilarity: 0,
        maximumEffectSimilarity: 0.35,
        preferSimilarEffects: true,
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
        rendering: renderings['item-identification'],
      },
      '5': {
        ...controls['ability-effects'],
        minimumEffectSimilarity: 0,
        maximumEffectSimilarity: 0.35,
        preferSimilarEffects: true,
        allowMissingSprites: true,
        response: {
          kind: 'search',
          candidates: 'provided',
        },
        rendering: renderings['item-identification'],
      },
    },
  },
  'held-item-effects': {
    levels: {
      '3': {
        ...controls['held-item-effects'],
        sameItemCategory: true,
        minimumEffectSimilarity: 0,
        maximumEffectSimilarity: 0.8,
        preferSimilarEffects: false,
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
        rendering: renderings['item-identification'],
      },
      '4': {
        ...controls['held-item-effects'],
        sameItemCategory: true,
        minimumEffectSimilarity: 0.3,
        maximumEffectSimilarity: 0.8,
        preferSimilarEffects: true,
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
        rendering: renderings['item-identification'],
      },
      '5': {
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
        rendering: renderings['item-identification'],
      },
    },
  },
  'hidden-abilities': {
    levels: {
      '4': {
        ...controls['hidden-abilities'],
        sameTypeAbilityDistractors: false,
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
        rendering: renderings['item-identification'],
      },
      '5': {
        ...controls['hidden-abilities'],
        sameTypeAbilityDistractors: true,
        allowMissingSprites: true,
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
        rendering: renderings['item-identification'],
      },
    },
  },
  'nature-effects': {
    levels: {
      '4': {
        ...controls['nature-effects'],
        shareNatureStat: false,
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
        rendering: renderings['item-identification'],
      },
      '5': {
        ...controls['nature-effects'],
        shareNatureStat: true,
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
        rendering: renderings['item-identification'],
      },
    },
  },
  'ev-yields': {
    levels: {
      '4': {
        ...controls['ev-yields'],
        completeEvYield: false,
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
        rendering: renderings['item-identification'],
      },
      '5': {
        ...controls['ev-yields'],
        completeEvYield: true,
        closeAlternatives: true,
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
        rendering: renderings['item-identification'],
      },
    },
  },
  'encounter-locations': {
    levels: {
      '4': {
        ...controls['encounter-locations'],
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
        rendering: renderings['item-identification'],
      },
      '5': {
        ...controls['encounter-locations'],
        encounterConditions: true,
        closeAlternatives: true,
        multiSelectEncounters: true,
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
        rendering: renderings['item-identification'],
      },
    },
  },
  'berry-flavors': {
    levels: {
      '4': {
        ...controls['berry-flavors'],
        completeFlavors: false,
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
        rendering: renderings['item-identification'],
      },
      '5': {
        ...controls['berry-flavors'],
        completeFlavors: true,
        allOptions: true,
        response: {
          kind: 'choices',
          minimumOptions: 2,
        },
        rendering: renderings['item-identification'],
      },
    },
  },
  'natural-gift': {
    levels: {
      '5': {
        ...controls['natural-gift'],
        allOptions: true,
        response: {
          kind: 'choices',
          minimumOptions: 2,
        },
        rendering: renderings['item-identification'],
      },
    },
  },
  'pokedex-scan': {
    standard: {
      ...controls['pokedex-scan'],
      response: {
        kind: 'choices',
        minimumOptions: 4,
      },
      rendering: renderings['pokedex-scan'],
    },
    levels: {
      '1': {
        ...controls['pokedex-scan'],
        currentSpriteChance: 1,
        distractorRankDirection: 'least-similar',
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
        rendering: renderings['pokedex-scan'],
      },
      '2': {
        ...controls['pokedex-scan'],
        currentSpriteChance: 1,
        distractorRankDirection: 'most-similar',
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
        rendering: renderings['pokedex-scan'],
      },
      '4': {
        ...controls['pokedex-scan'],
        distractorRankDirection: 'most-similar',
        distractorPoolSize: 6,
        smallPoolPolicy: 'fixed-size',
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
        rendering: renderings['pokedex-scan'],
      },
      '5': {
        ...controls['pokedex-scan'],
        response: {
          kind: 'search',
          candidates: 'pool',
        },
        backSpriteChance: 1,
        rendering: renderings['pokedex-scan'],
      },
    },
  },
  'sprite-match': {
    standard: {
      ...controls['sprite-match'],
      response: {
        kind: 'choices',
        minimumOptions: 4,
      },
      rendering: renderings['sprite-match'],
    },
    levels: {
      '1': {
        ...controls['sprite-match'],
        distractorRankDirection: 'least-similar',
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
        rendering: renderings['sprite-match'],
      },
      '3': {
        ...controls['sprite-match'],
        distractorRankDirection: 'most-similar',
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
        rendering: renderings['sprite-match'],
      },
      '4': {
        ...controls['sprite-match'],
        distractorRankDirection: 'most-similar',
        distractorPoolSize: 6,
        smallPoolPolicy: 'fixed-size',
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
        rendering: renderings['sprite-match'],
      },
      '5': {
        ...controls['sprite-match'],
        distractorRankDirection: 'most-similar',
        distractorPoolSize: 3,
        smallPoolPolicy: 'fixed-size',
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
        rendering: renderings['sprite-match'],
      },
    },
  },
  'silhouette-match': {
    standard: {
      ...controls['silhouette-match'],
      response: {
        kind: 'choices',
        minimumOptions: 4,
      },
      rendering: renderings['silhouette-match'],
    },
    levels: {
      '2': {
        ...controls['silhouette-match'],
        distractorRankDirection: 'least-similar',
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
        rendering: renderings['silhouette-match'],
      },
      '4': {
        ...controls['silhouette-match'],
        distractorRankDirection: 'most-similar',
        distractorPoolSize: 6,
        smallPoolPolicy: 'fixed-size',
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
        rendering: renderings['silhouette-match'],
      },
      '5': {
        ...controls['silhouette-match'],
        distractorRankDirection: 'most-similar',
        distractorPoolSize: 3,
        smallPoolPolicy: 'fixed-size',
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
        rendering: renderings['silhouette-match'],
      },
    },
  },
  'whos-that-pokemon': {
    standard: {
      ...controls['whos-that-pokemon'],
      response: {
        kind: 'choices',
        minimumOptions: 4,
      },
      rendering: renderings['whos-that-pokemon'],
    },
    levels: {
      '2': {
        ...controls['whos-that-pokemon'],
        distractorRankDirection: 'least-similar',
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
        rendering: renderings['whos-that-pokemon'],
      },
      '3': {
        ...controls['whos-that-pokemon'],
        distractorRankDirection: 'most-similar',
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
        rendering: renderings['whos-that-pokemon'],
      },
      '5': {
        ...controls['whos-that-pokemon'],
        response: {
          kind: 'search',
          candidates: 'pool',
        },
        rendering: renderings['whos-that-pokemon'],
      },
    },
  },
  'pixel-peek': {
    standard: {
      ...controls['pixel-peek'],
      response: {
        kind: 'choices',
        minimumOptions: 4,
      },
      rendering: renderings['pokedex-scan'],
    },
    levels: {
      '3': {
        ...controls['pixel-peek'],
        cropScale: 0.65,
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
        rendering: renderings['pokedex-scan'],
      },
      '4': {
        ...controls['pixel-peek'],
        distractorRankDirection: 'most-similar',
        distractorPoolSize: 6,
        smallPoolPolicy: 'fixed-size',
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
        rendering: renderings['pokedex-scan'],
      },
      '5': {
        ...controls['pixel-peek'],
        response: {
          kind: 'search',
          candidates: 'pool',
        },
        cropScale: 1.4,
        rendering: renderings['pokedex-scan'],
      },
    },
  },
  'shiny-spotter': {
    standard: {
      ...controls['shiny-spotter'],
      response: {
        kind: 'choices',
        minimumOptions: 4,
      },
      rendering: renderings['item-identification'],
    },
    levels: {
      '3': {
        ...controls['shiny-spotter'],
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
        rendering: renderings['item-identification'],
      },
      '4': {
        ...controls['shiny-spotter'],
        distractorRankDirection: 'most-similar',
        distractorPoolSize: 6,
        smallPoolPolicy: 'fixed-size',
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
        rendering: renderings['item-identification'],
      },
      '5': {
        ...controls['shiny-spotter'],
        distractorRankDirection: 'most-similar',
        distractorPoolSize: 3,
        smallPoolPolicy: 'fixed-size',
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
        rendering: renderings['item-identification'],
      },
    },
  },
  'field-notes': {
    standard: {
      ...controls['field-notes'],
      response: {
        kind: 'choices',
        minimumOptions: 4,
      },
      rendering: renderings['item-identification'],
    },
    levels: {
      '2': {
        ...controls['field-notes'],
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
        rendering: renderings['item-identification'],
      },
      '4': {
        ...controls['field-notes'],
        response: {
          kind: 'search',
          candidates: 'pool',
        },
        view: {
          answer: { kind: 'pokemon' },
          subject: { identity: 'after-answer', portrait: 'after-answer' },
        },
        rendering: renderings['item-identification'],
      },
    },
  },
  'type-check': {
    standard: {
      ...controls['type-check'],
      response: {
        kind: 'choices',
        minimumOptions: 4,
      },
      rendering: renderings['item-identification'],
    },
    levels: {
      '2': {
        ...controls['type-check'],
        singleType: true,
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
        rendering: renderings['item-identification'],
      },
      '3': {
        ...controls['type-check'],
        response: {
          kind: 'type-grid',
          correct: 'subject-types',
        },
        rendering: renderings['item-identification'],
      },
    },
  },
  'odd-one-out': {
    standard: {
      ...controls['odd-one-out'],
      response: {
        kind: 'choices',
        minimumOptions: 4,
      },
      rendering: renderings['item-identification'],
    },
    levels: {
      '2': {
        ...controls['odd-one-out'],
        singleType: true,
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
        rendering: renderings['item-identification'],
      },
      '3': {
        ...controls['odd-one-out'],
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
        rendering: renderings['item-identification'],
      },
    },
  },
  'type-roundup': {
    standard: {
      ...controls['type-roundup'],
      response: {
        kind: 'choices',
        minimumOptions: 4,
      },
      rendering: renderings['item-identification'],
    },
    levels: {
      '2': {
        ...controls['type-roundup'],
        singleType: true,
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
        rendering: renderings['item-identification'],
      },
      '3': {
        ...controls['type-roundup'],
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
        rendering: renderings['item-identification'],
      },
    },
  },
  'type-twins': {
    standard: {
      ...controls['type-twins'],
      response: {
        kind: 'choices',
        minimumOptions: 4,
      },
      rendering: renderings['item-identification'],
    },
    levels: {
      '3': {
        ...controls['type-twins'],
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
        rendering: renderings['item-identification'],
      },
    },
  },
  'legend-hunt': {
    standard: {
      ...controls['legend-hunt'],
      response: {
        kind: 'choices',
        minimumOptions: 4,
      },
      rendering: renderings['item-identification'],
    },
    levels: {
      '2': {
        ...controls['legend-hunt'],
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
        rendering: renderings['item-identification'],
      },
    },
  },
  'generation-roundup': {
    standard: {
      ...controls['generation-roundup'],
      response: {
        kind: 'choices',
        minimumOptions: 4,
      },
      rendering: renderings['generation-roundup'],
    },
    levels: {
      '2': {
        ...controls['generation-roundup'],
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
        rendering: renderings['generation-roundup'],
      },
    },
  },
  'evolution-link': {
    standard: {
      ...controls['evolution-link'],
      response: {
        kind: 'choices',
        minimumOptions: 4,
      },
      rendering: renderings['evolution-link'],
    },
    levels: {
      '2': {
        ...controls['evolution-link'],
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
        rendering: renderings['evolution-link'],
      },
      '4': {
        ...controls['evolution-link'],
        response: {
          kind: 'search',
          candidates: 'pool',
        },
        rendering: renderings['evolution-link'],
      },
    },
  },
  'evolution-shift': {
    standard: {
      ...controls['evolution-shift'],
      response: {
        kind: 'choices',
        minimumOptions: 4,
      },
      rendering: renderings['evolution-shift'],
    },
    levels: {
      '3': {
        ...controls['evolution-shift'],
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
        rendering: renderings['evolution-shift'],
      },
      '5': {
        ...controls['evolution-shift'],
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
        rendering: renderings['evolution-shift@5'],
      },
    },
  },
  'ability-check': {
    standard: {
      ...controls['ability-check'],
      response: {
        kind: 'choices',
        minimumOptions: 4,
      },
      rendering: renderings['item-identification'],
    },
    levels: {
      '3': {
        ...controls['ability-check'],
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
        rendering: renderings['item-identification'],
      },
      '5': {
        ...controls['ability-check'],
        plausibleProperties: true,
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
        rendering: renderings['item-identification'],
      },
    },
  },
  'move-check': {
    standard: {
      ...controls['move-check'],
      response: {
        kind: 'choices',
        minimumOptions: 4,
      },
      rendering: renderings['item-identification'],
    },
    levels: {
      '4': {
        ...controls['move-check'],
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
        rendering: renderings['item-identification'],
      },
      '5': {
        ...controls['move-check'],
        plausibleProperties: true,
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
        rendering: renderings['item-identification'],
      },
    },
  },
  'stat-showdown': {
    standard: {
      ...controls['stat-showdown'],
      response: {
        kind: 'choices',
        minimumOptions: 4,
      },
      rendering: renderings['item-identification'],
    },
    levels: {
      '3': {
        ...controls['stat-showdown'],
        statGap: [41, Infinity],
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
        rendering: renderings['item-identification'],
      },
      '4': {
        ...controls['stat-showdown'],
        statGap: [21, 40],
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
        rendering: renderings['item-identification'],
      },
      '5': {
        ...controls['stat-showdown'],
        statGap: [10, 20],
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
        rendering: renderings['item-identification'],
      },
    },
  },
  'type-matchup': {
    standard: {
      ...controls['type-matchup'],
      response: {
        kind: 'choices',
        minimumOptions: 4,
      },
      rendering: renderings['item-identification'],
    },
    levels: {
      '1': {
        ...controls['type-matchup'],
        singleType: true,
        showTypes: true,
        multipliers: [2],
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
        rendering: renderings['item-identification'],
      },
      '2': {
        ...controls['type-matchup'],
        singleType: true,
        multipliers: [2],
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
        rendering: renderings['item-identification'],
      },
      '3': {
        ...controls['type-matchup'],
        showTypes: true,
        multipliers: [2, 4],
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
        rendering: renderings['item-identification'],
      },
      '4': {
        ...controls['type-matchup'],
        multipliers: [0.25, 0.5, 2, 4],
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
        rendering: renderings['item-identification'],
      },
      '5': {
        ...controls['type-matchup'],
        response: {
          kind: 'type-grid',
          correct: 'effectiveness',
        },
        multipliers: [0, 0.25, 0.5, 1, 2, 4],
        rendering: renderings['item-identification'],
      },
    },
  },
  'counter-pick': {
    standard: {
      ...controls['counter-pick'],
      response: {
        kind: 'choices',
        minimumOptions: 4,
      },
      rendering: renderings['counter-pick'],
    },
    levels: {
      '2': {
        ...controls['counter-pick'],
        singleType: true,
        showTypes: true,
        multipliers: [2],
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
        rendering: renderings['counter-pick'],
      },
      '3': {
        ...controls['counter-pick'],
        showTypes: true,
        multipliers: [2, 4],
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
        rendering: renderings['counter-pick@3'],
      },
      '4': {
        ...controls['counter-pick'],
        multipliers: [0.25, 0.5, 2, 4],
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
        rendering: renderings['counter-pick'],
      },
      '5': {
        ...controls['counter-pick'],
        distractorRankDirection: 'most-similar',
        distractorPoolSize: 3,
        multipliers: [0.25, 0.5, 2, 4],
        smallPoolPolicy: 'fixed-size',
        response: {
          kind: 'choices',
          minimumOptions: 4,
        },
        rendering: renderings['counter-pick'],
      },
    },
  },
  champion: {
    standard: {
      ...controls['champion'],
      response: {
        kind: 'choices',
        minimumOptions: 4,
      },
      rendering: renderings['champion'],
    },
    levels: {
      '1': {
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
        rendering: renderings['champion'],
      },
      '2': {
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
        rendering: renderings['champion'],
      },
      '3': {
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
        rendering: renderings['champion'],
      },
      '5': {
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
        rendering: renderings['champion'],
      },
    },
  },
} satisfies {
  [Type in keyof FamilyRules]: {
    standard?: FamilyRules[Type];
    levels: DifficultyRules<FamilyRules[Type]>;
  };
};
