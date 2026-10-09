import type { FamilyRule, NoControls } from '../questions/family-rules.ts';
import type {
  QuestionControls,
  QuestionRuleRow,
  VisibleItem,
} from './types.ts';
import { itemSprite, responsePresets } from './shared.ts';

export type Rules = FamilyRule<NoControls, 'type', 'single'>;

export type Rendering = { subject?: VisibleItem };

const controls = {
  view: { answer: { kind: 'type' } },
} satisfies QuestionControls<Rules>;

const rendering = {
  subject: { sprite: itemSprite },
} satisfies Rendering;

export const naturalGift = {
  active: false,
  rendering,
  levels: {
    5: {
      ...controls,
      response: responsePresets.shortSingle,
    },
  },
} satisfies QuestionRuleRow<Rules, Rendering>;
