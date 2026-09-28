import type { FamilyRules } from '../questions/family-rules.ts';
import type {
  QuestionControlsFor,
  QuestionRuleRow,
  RenderingControlsFor,
} from './types.ts';
import { responsePresets } from './shared.ts';

const controls = {
  view: { answer: { kind: 'pokemon' } },
} as const satisfies QuestionControlsFor<'legendaryMythicalSelection'>;

const rendering =
  {} satisfies RenderingControlsFor<'legendaryMythicalSelection'>;

export const legendaryMythicalSelection = {
  rendering,
  unleveled: {
    ...controls,
    response: responsePresets.multi,
  },
  levels: {
    2: {
      ...controls,
      response: responsePresets.multi,
    },
  },
} satisfies QuestionRuleRow<
  FamilyRules['legendaryMythicalSelection'],
  'legendaryMythicalSelection'
>;
