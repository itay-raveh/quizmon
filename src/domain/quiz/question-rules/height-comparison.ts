import type { FamilyRules } from '../questions/family-rules.ts';
import type {
  QuestionControlsFor,
  QuestionRuleRow,
  RenderingControlsFor,
} from './types.ts';
import { responsePresets } from './shared.ts';

const controls = {
  view: { answer: { kind: 'pokemon' } },
} as const satisfies QuestionControlsFor<'heightComparison'>;

const rendering = {} satisfies RenderingControlsFor<'heightComparison'>;

export const heightComparison = {
  rendering,
  levels: {
    2: {
      ...controls,
      measurement: {
        minimumRatio: 2,
        maximumRatio: Infinity,
        maximumSpread: Infinity,
      },
      response: responsePresets.single,
    },
    3: {
      ...controls,
      measurement: {
        minimumRatio: 1.3,
        maximumRatio: Infinity,
        maximumSpread: Infinity,
      },
      response: responsePresets.single,
    },
    4: {
      ...controls,
      measurement: {
        minimumRatio: 1.3,
        maximumRatio: 2,
        maximumSpread: 2,
      },
      response: responsePresets.single,
    },
    5: {
      ...controls,
      rendering: { choices: { name: 'always', sprite: null } },
      measurement: {
        minimumRatio: 1.3,
        maximumRatio: 1.5,
        maximumSpread: 1.5,
      },
      response: responsePresets.single,
    },
  },
} satisfies QuestionRuleRow<
  FamilyRules['heightComparison'],
  'heightComparison'
>;
