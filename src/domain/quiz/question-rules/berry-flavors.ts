import type { FamilyRule, NoControls } from '../questions/family-rules.ts';
import type {
  QuestionControls,
  QuestionRuleRow,
  VisibleItem,
} from './types.ts';
import { itemSprite, responsePresets } from './shared.ts';

export type Rules = FamilyRule<NoControls, 'text', 'single' | 'multi'>;

export type Rendering = { subject?: VisibleItem };

const controls = {
  view: { answer: { kind: 'text' } },
} satisfies QuestionControls<Rules>;

const rendering = {
  subject: { sprite: itemSprite },
} satisfies Rendering;

export const berryFlavors = {
  active: false,
  rendering,
  levels: {
    4: {
      ...controls,
      response: responsePresets.single,
    },
    5: {
      ...controls,
      response: responsePresets.shortMulti,
    },
  },
} satisfies QuestionRuleRow<Rules, Rendering>;
