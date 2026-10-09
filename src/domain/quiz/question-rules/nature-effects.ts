import type { FamilyRule } from '../questions/family-rules.ts';
import type {
  QuestionControls,
  QuestionRuleRow,
  RenderingControls,
} from './types.ts';
import { responsePresets } from './shared.ts';

export type Rules = FamilyRule<
  {
    /** Choose wrong natures that share a raised or lowered stat. */
    shareNatureStat: boolean;
  },
  'text',
  'single'
>;

export type Rendering = RenderingControls;

const controls = {
  view: { answer: { kind: 'text', detail: 'nature' } },
  shareNatureStat: false,
} satisfies QuestionControls<Rules>;

export const natureEffects = {
  levels: {
    4: {
      ...controls,
      shareNatureStat: false,
      response: responsePresets.single,
    },
    5: {
      ...controls,
      shareNatureStat: true,
      response: responsePresets.single,
    },
  },
} satisfies QuestionRuleRow<Rules, Rendering>;
