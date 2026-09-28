import type { FamilyRules } from '../questions/family-rules.ts';
import type {
  QuestionControlsFor,
  QuestionRuleRow,
  RenderingControlsFor,
} from './types.ts';
import { responsePresets } from './shared.ts';

const controls = {
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
} as const satisfies QuestionControlsFor<'pokedexCategories'>;

const rendering = {} satisfies RenderingControlsFor<'pokedexCategories'>;

export const pokedexCategories = {
  rendering,
  levels: {
    2: {
      ...controls,
      response: responsePresets.single,
    },
    3: {
      ...controls,
      sameColorOrShape: true,
      response: responsePresets.single,
    },
    5: {
      ...controls,
      sameColorOrShape: true,
      closeAlternatives: true,
      response: responsePresets.single,
    },
  },
} satisfies QuestionRuleRow<
  FamilyRules['pokedexCategories'],
  'pokedexCategories'
>;
