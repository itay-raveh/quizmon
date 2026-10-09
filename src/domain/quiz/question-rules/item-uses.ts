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
  view: { answer: { kind: 'text' } },
} satisfies QuestionControls<Rules>;

const rendering = {
  subject: { sprite: itemSprite },
} satisfies Rendering;

export const itemUses = {
  rendering,
  levels: {
    3: {
      ...controls,
      sameItemCategory: true,

      maximumEffectSimilarity: 0.8,
      preferSimilarEffects: false,
      response: responsePresets.single,
    },
    4: {
      ...controls,
      rendering: { subject: { name: 'after-answer' } },
      sameItemCategory: true,
      minimumEffectSimilarity: 0.3,
      maximumEffectSimilarity: 0.8,

      response: responsePresets.single,
    },
    5: {
      ...controls,
      rendering: { subject: { name: 'after-answer' } },
      sameItemCategory: true,
      minimumEffectSimilarity: 0.5,
      maximumEffectSimilarity: 0.8,

      useFullEffectText: true,

      response: responsePresets.single,
    },
  },
} satisfies QuestionRuleRow<Rules, Rendering>;
