import type { FamilyRules } from '../questions/family-rules.ts';
import type {
  QuestionControlsFor,
  QuestionRuleRow,
  RenderingControlsFor,
} from './types.ts';
import { answerSprite, responsePresets } from './shared.ts';

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
} as const satisfies QuestionControlsFor<'pokedexEntryMatch'>;

const rendering = {
  subject: { name: 'never', number: 'never' },
} satisfies RenderingControlsFor<'pokedexEntryMatch'>;

export const pokedexEntryMatch = {
  rendering,
  unleveled: {
    ...controls,
    response: responsePresets.single,
  },
  levels: {
    4: {
      ...controls,
      response: responsePresets.single,
    },
    5: {
      ...controls,
      response: {
        kind: 'search',
        selection: 'single',
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
} satisfies QuestionRuleRow<
  FamilyRules['pokedexEntryMatch'],
  'pokedexEntryMatch'
>;
