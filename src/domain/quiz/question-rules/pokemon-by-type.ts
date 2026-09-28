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
  unleveled: {
    ...controls,
    response: responsePresets.multi,
  },
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
  },
} satisfies QuestionRuleRow<FamilyRules['pokemonByType'], 'pokemonByType'>;
