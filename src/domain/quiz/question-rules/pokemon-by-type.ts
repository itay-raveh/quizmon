import type { FamilyRules } from '../questions/family-rules.ts';
import type {
  QuestionControlsFor,
  QuestionRuleRow,
  RenderingControlsFor,
} from './types.ts';
import { responsePresets } from './shared.ts';

const controls = {
  view: { answer: { kind: 'pokemon' } },
  singleType: false,
} as const satisfies QuestionControlsFor<'pokemonByType'>;

const rendering = {
  choices: { name: 'always', types: 'after-answer' },
} satisfies RenderingControlsFor<'pokemonByType'>;

export const pokemonByType = {
  rendering,
  levels: {
    2: {
      ...controls,
      singleType: true,
      response: responsePresets.multi,
    },
    3: {
      ...controls,
      response: responsePresets.multi,
    },
    5: null,
  },
} satisfies QuestionRuleRow<FamilyRules['pokemonByType'], 'pokemonByType'>;
