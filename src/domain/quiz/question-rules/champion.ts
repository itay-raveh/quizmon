import type { FamilyRules } from '../questions/family-rules.ts';
import type {
  QuestionControlsFor,
  QuestionRuleRow,
  RenderingControlsFor,
} from './types.ts';
import { silhouetteSprite, responsePresets } from './shared.ts';

const controls = {
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
} as const satisfies QuestionControlsFor<'champion'>;

const rendering = {
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
} satisfies RenderingControlsFor<'champion'>;

export const champion = {
  rendering,
  unleveled: {
    ...controls,
    response: responsePresets.single,
  },
  levels: {
    1: {
      ...controls,
      rendering: { choices: { types: 'always' } },
      finale: {
        opening: 'choices-types',
        assistance: false,
        penalty: 2,
      },
      response: responsePresets.single,
    },
    2: {
      ...controls,
      finale: {
        opening: 'choices',
        assistance: false,
        penalty: 1,
      },
      response: responsePresets.single,
    },
    3: {
      ...controls,
      finale: {
        opening: 'search',
        assistance: true,
        penalty: 0,
      },
      response: responsePresets.adaptive,
    },
    5: {
      ...controls,
      finale: {
        opening: 'search',
        assistance: false,
        penalty: 0,
      },
      response: responsePresets.adaptive,
    },
  },
} satisfies QuestionRuleRow<FamilyRules['champion'], 'champion'>;
