import type { FamilyRules } from '../questions/family-rules.ts';
import type {
  QuestionControlsFor,
  QuestionRuleRow,
  RenderingControlsFor,
} from './types.ts';
import { frontSprite, answerSprite, responsePresets } from './shared.ts';

const controls = {
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
} as const satisfies QuestionControlsFor<'superEffectiveAttacker'>;

const rendering = {
  subject: { sprite: frontSprite, types: 'after-answer' },
  related: { sprite: answerSprite, name: 'never', number: 'never' },
  choices: { name: 'always', types: 'after-answer' },
} satisfies RenderingControlsFor<'superEffectiveAttacker'>;

export const superEffectiveAttacker = {
  rendering,
  unleveled: {
    ...controls,
    response: responsePresets.single,
  },
  levels: {
    2: {
      ...controls,
      singleType: true,
      rendering: {
        subject: { types: 'always' },
        choices: { types: 'always' },
      },
      multipliers: [2],
      response: responsePresets.single,
    },
    3: {
      ...controls,
      multipliers: [2, 4],
      response: responsePresets.single,
      rendering: { choices: { types: 'always' } },
    },
    4: {
      ...controls,
      multipliers: [0.25, 0.5, 2, 4],
      response: responsePresets.single,
    },
    5: {
      ...controls,
      distractorRankDirection: 'most-similar',
      distractorPoolSize: 3,
      multipliers: [0.25, 0.5, 2, 4],
      smallPoolPolicy: 'fixed-size',
      response: responsePresets.single,
    },
  },
} satisfies QuestionRuleRow<
  FamilyRules['superEffectiveAttacker'],
  'superEffectiveAttacker'
>;
