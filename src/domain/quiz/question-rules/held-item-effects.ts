import type {
  FamilyRule,
  EffectDistractors,
} from '../questions/family-rules.ts';
import type {
  QuestionControls,
  QuestionRuleRow,
  VisibleItem,
} from './types.ts';
import { itemSprite, responsePresets } from './shared.ts';

export type Rules = FamilyRule<
  EffectDistractors & {
    /** Restrict wrong effects to items in the target's category. */
    sameItemCategory: boolean;
    /** Permit targets without an item sprite. */
    allowMissingSprites: boolean;
  },
  'text',
  'single'
>;

export type Rendering = { subject?: VisibleItem };

const controls = {
  view: { answer: { kind: 'text', layout: 'statements' } },
} satisfies QuestionControls<Rules>;

const rendering = {
  subject: { sprite: itemSprite },
} satisfies Rendering;

export const heldItemEffects = {
  rendering,
  levels: {
    4: {
      ...controls,
      sameItemCategory: true,
      minimumEffectSimilarity: 0.3,
      maximumEffectSimilarity: 0.8,

      response: responsePresets.single,
    },
    5: {
      ...controls,
      sameItemCategory: true,
      minimumEffectSimilarity: 0.5,
      maximumEffectSimilarity: 0.8,

      useFullEffectText: true,
      allowMissingSprites: true,
      response: responsePresets.single,
    },
  },
} satisfies QuestionRuleRow<Rules, Rendering>;
