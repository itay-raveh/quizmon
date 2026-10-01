import type { FamilyRules } from '../questions/family-rules.ts';
import type {
  QuestionControlsFor,
  QuestionRuleRow,
  RenderingControlsFor,
} from './types.ts';
import { responsePresets } from './shared.ts';

const controls = {
  view: { answer: { kind: 'pokemon' } },
} as const satisfies QuestionControlsFor<'pokemonByGeneration'>;

const rendering = {
  choices: { name: 'always', number: 'after-answer' },
} satisfies RenderingControlsFor<'pokemonByGeneration'>;

export const pokemonByGeneration = {
  rendering,
  lastLevel: 3,
  unleveled: {
    ...controls,
    response: responsePresets.multi,
  },
  levels: {
    3: {
      ...controls,
      response: responsePresets.multi,
    },
  },
} satisfies QuestionRuleRow<
  FamilyRules['pokemonByGeneration'],
  'pokemonByGeneration'
>;
