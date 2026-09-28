import type { FamilyRules } from '../questions/family-rules.ts';
import type {
  QuestionControlsFor,
  QuestionRuleRow,
  RenderingControlsFor,
} from './types.ts';
import { frontSprite, responsePresets } from './shared.ts';

const controls = {
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
} as const satisfies QuestionControlsFor<'pokemonTypes'>;

const rendering = {
  subject: { sprite: frontSprite, types: 'after-answer' },
} satisfies RenderingControlsFor<'pokemonTypes'>;

export const pokemonTypes = {
  rendering,
  unleveled: {
    ...controls,
    response: responsePresets.single,
  },
  levels: {
    2: {
      ...controls,
      singleType: true,
      response: responsePresets.single,
    },
    3: {
      ...controls,
      response: {
        kind: 'type-grid',
        correct: 'subject-types',
      },
    },
  },
} satisfies QuestionRuleRow<FamilyRules['pokemonTypes'], 'pokemonTypes'>;
