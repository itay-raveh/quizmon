import type { FamilyRules } from '../questions/family-rules.ts';
import type {
  QuestionControlsFor,
  QuestionRuleRow,
  RenderingControlsFor,
} from './types.ts';
import { frontSprite, answerSprite, responsePresets } from './shared.ts';

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
} as const satisfies QuestionControlsFor<'evolutionChain'>;

const rendering = {
  subject: {
    sprite: answerSprite,
    name: 'after-answer',
    number: 'after-answer',
  },
  choices: { name: 'always', sprite: null, number: 'never' },
  related: { sprite: frontSprite },
  search: { sprite: null },
} satisfies RenderingControlsFor<'evolutionChain'>;

export const evolutionChain = {
  rendering,
  unleveled: {
    ...controls,
    response: responsePresets.single,
  },
  levels: {
    2: {
      ...controls,
      response: responsePresets.single,
    },
    4: {
      ...controls,
      response: {
        kind: 'search',
        selection: 'single',
        candidates: 'pool',
      },
    },
  },
} satisfies QuestionRuleRow<FamilyRules['evolutionChain'], 'evolutionChain'>;
