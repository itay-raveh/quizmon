import type { FamilyRules } from '../questions/family-rules.ts';
import type {
  QuestionControlsFor,
  QuestionRuleRow,
  RenderingControlsFor,
} from './types.ts';
import { frontSprite, responsePresets } from './shared.ts';

const controls = {
  view: { answer: { kind: 'type' } },
  singleType: false,
  multipliers: [4, 2, 0.5, 0.25],
} as const satisfies QuestionControlsFor<'typeMatchup'>;

const rendering = {
  subject: { sprite: frontSprite, types: 'after-answer' },
} satisfies RenderingControlsFor<'typeMatchup'>;

export const typeMatchup = {
  rendering,
  unleveled: {
    ...controls,
    response: responsePresets.single,
  },
  levels: {
    1: {
      ...controls,
      singleType: true,
      rendering: { subject: { types: 'always' } },
      multipliers: [2],
      response: responsePresets.single,
    },
    2: {
      ...controls,
      singleType: true,
      multipliers: [2],
      response: responsePresets.single,
    },
    3: {
      ...controls,
      rendering: { subject: { types: 'always' } },
      multipliers: [2, 4],
      response: responsePresets.single,
    },
    4: {
      ...controls,
      multipliers: [0.25, 0.5, 2, 4],
      response: responsePresets.single,
    },
    5: {
      ...controls,
      response: {
        kind: 'search',
        selection: 'multi',
        candidates: 'types',
        correct: 'effectiveness',
      },
      multipliers: [0, 0.25, 0.5, 1, 2, 4],
    },
  },
} satisfies QuestionRuleRow<FamilyRules['typeMatchup'], 'typeMatchup'>;
