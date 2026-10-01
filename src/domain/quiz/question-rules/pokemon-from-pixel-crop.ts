import type { FamilyRules } from '../questions/family-rules.ts';
import type {
  QuestionControlsFor,
  QuestionRuleRow,
  RenderingControlsFor,
} from './types.ts';
import { frontSprite, responsePresets } from './shared.ts';

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
  cropScale: 1,
} as const satisfies QuestionControlsFor<'pokemonFromPixelCrop'>;

const rendering = {
  subject: {
    sprite: frontSprite,
    name: 'after-answer',
    number: 'after-answer',
  },
  choices: { name: 'always', sprite: null },
  search: { sprite: null },
} satisfies RenderingControlsFor<'pokemonFromPixelCrop'>;

export const pokemonFromPixelCrop = {
  rendering,
  levels: {
    1: {
      ...controls,
      cropScale: 0.45,
      response: responsePresets.single,
    },
    2: {
      ...controls,
      cropScale: 0.55,
      response: responsePresets.single,
    },
    3: {
      ...controls,
      cropScale: 0.65,
      response: responsePresets.single,
    },
    4: {
      ...controls,
      distractorRankDirection: 'most-similar',
      distractorPoolSize: 6,
      smallPoolPolicy: 'fixed-size',
      response: responsePresets.single,
    },
    5: {
      ...controls,
      response: {
        kind: 'search',
        selection: 'single',
        candidates: 'pool',
      },
      cropScale: 1.4,
    },
  },
} satisfies QuestionRuleRow<
  FamilyRules['pokemonFromPixelCrop'],
  'pokemonFromPixelCrop'
>;
