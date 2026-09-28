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
} as const satisfies QuestionControlsFor<'pokemonFromSilhouette'>;

const rendering = {
  subject: {
    sprite: silhouetteSprite,
    name: 'after-answer',
    number: 'after-answer',
  },
  choices: { name: 'always', sprite: null },
  search: { sprite: null },
} satisfies RenderingControlsFor<'pokemonFromSilhouette'>;

export const pokemonFromSilhouette = {
  rendering,
  unleveled: {
    ...controls,
    response: responsePresets.single,
  },
  levels: {
    2: {
      ...controls,
      distractorRankDirection: 'least-similar',
      response: responsePresets.single,
    },
    3: {
      ...controls,
      distractorRankDirection: 'most-similar',
      response: responsePresets.single,
    },
    5: {
      ...controls,
      response: {
        kind: 'search',
        candidates: 'pool',
      },
    },
  },
} satisfies QuestionRuleRow<
  FamilyRules['pokemonFromSilhouette'],
  'pokemonFromSilhouette'
>;
