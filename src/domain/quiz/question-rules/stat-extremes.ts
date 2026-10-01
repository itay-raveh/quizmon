import type { FamilyRules } from '../questions/family-rules.ts';
import type {
  QuestionControlsFor,
  QuestionRuleRow,
  RenderingControlsFor,
} from './types.ts';
import { responsePresets } from './shared.ts';

const controls = {
  view: { answer: { kind: 'pokemon' } },
  statGap: null,
} as const satisfies QuestionControlsFor<'statExtremes'>;

const rendering = {} satisfies RenderingControlsFor<'statExtremes'>;

export const statExtremes = {
  rendering,
  levels: {
    3: {
      ...controls,
      statGap: [41, Infinity],
      response: responsePresets.single,
    },
    4: {
      ...controls,
      statGap: [21, 40],
      response: responsePresets.single,
    },
    5: {
      ...controls,
      statGap: [10, 20],
      response: responsePresets.single,
    },
  },
} satisfies QuestionRuleRow<FamilyRules['statExtremes'], 'statExtremes'>;
