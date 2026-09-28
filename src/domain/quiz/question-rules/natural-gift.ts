import type { FamilyRules } from '../questions/family-rules.ts';
import type {
  QuestionControlsFor,
  QuestionRuleRow,
  RenderingControlsFor,
} from './types.ts';
import { itemSprite, responsePresets } from './shared.ts';

const controls = {
  view: { answer: { kind: 'type' } },
} as const satisfies QuestionControlsFor<'naturalGift'>;

const rendering = {
  subject: { sprite: itemSprite },
} satisfies RenderingControlsFor<'naturalGift'>;

export const naturalGift = {
  rendering,
  levels: {
    5: {
      ...controls,
      response: responsePresets.shortSingle,
    },
  },
} satisfies QuestionRuleRow<FamilyRules['naturalGift'], 'naturalGift'>;
