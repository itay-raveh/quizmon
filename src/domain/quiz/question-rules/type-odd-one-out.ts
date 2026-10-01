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
} as const satisfies QuestionControlsFor<'typeOddOneOut'>;

const rendering = {
  choices: { name: 'always', types: 'after-answer' },
} satisfies RenderingControlsFor<'typeOddOneOut'>;

export const typeOddOneOut = {
  rendering,
  lastLevel: 4,
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
      response: responsePresets.single,
    },
  },
} satisfies QuestionRuleRow<FamilyRules['typeOddOneOut'], 'typeOddOneOut'>;
