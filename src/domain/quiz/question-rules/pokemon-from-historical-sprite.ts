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
  currentSpriteChance: 0,
  backSpriteChance: 0,
  frontSpriteChance: 0.75,
} as const satisfies QuestionControlsFor<'pokemonFromHistoricalSprite'>;

const rendering = {
  subject: {
    sprite: { ...frontSprite, source: 'all' },
    name: 'after-answer',
    number: 'after-answer',
  },
  choices: { name: 'always', sprite: null },
  search: { sprite: null },
} satisfies RenderingControlsFor<'pokemonFromHistoricalSprite'>;

export const pokemonFromHistoricalSprite = {
  rendering,
  unleveled: {
    ...controls,
    response: responsePresets.single,
  },
  levels: {
    1: {
      ...controls,
      currentSpriteChance: 1,
      distractorRankDirection: 'least-similar',
      response: responsePresets.single,
    },
    2: {
      ...controls,
      currentSpriteChance: 1,
      distractorRankDirection: 'most-similar',
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
        candidates: 'pool',
      },
      backSpriteChance: 1,
    },
  },
} satisfies QuestionRuleRow<
  FamilyRules['pokemonFromHistoricalSprite'],
  'pokemonFromHistoricalSprite'
>;
