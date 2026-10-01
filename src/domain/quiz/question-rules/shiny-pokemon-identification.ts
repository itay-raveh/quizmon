import type { FamilyRules } from '../questions/family-rules.ts';
import type {
  QuestionControlsFor,
  QuestionRuleRow,
  RenderingControlsFor,
} from './types.ts';
import { responsePresets } from './shared.ts';

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
} as const satisfies QuestionControlsFor<'shinyPokemonIdentification'>;

const rendering =
  {} satisfies RenderingControlsFor<'shinyPokemonIdentification'>;

export const shinyPokemonIdentification = {
  rendering,
  unleveled: {
    ...controls,
    response: responsePresets.single,
  },
  levels: {
    1: {
      ...controls,
      distractorRankDirection: 'least-similar',
      response: responsePresets.single,
    },
    3: {
      ...controls,
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
      distractorRankDirection: 'most-similar',
      distractorPoolSize: 3,
      smallPoolPolicy: 'fixed-size',
      response: responsePresets.single,
    },
  },
} satisfies QuestionRuleRow<
  FamilyRules['shinyPokemonIdentification'],
  'shinyPokemonIdentification'
>;
