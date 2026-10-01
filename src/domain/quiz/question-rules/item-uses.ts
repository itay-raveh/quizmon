import type { FamilyRules } from '../questions/family-rules.ts';
import type {
  QuestionControlsFor,
  QuestionRuleRow,
  RenderingControlsFor,
} from './types.ts';
import { itemSprite, responsePresets } from './shared.ts';

const controls = {
  view: { answer: { kind: 'text' } },
  minimumEffectSimilarity: 0,
  maximumEffectSimilarity: 0.35,
  preferSimilarEffects: true,
  useFullEffectText: false,
  sameItemCategory: false,
  allowMissingSprites: false,
} as const satisfies QuestionControlsFor<'itemUses'>;

const rendering = {
  subject: { sprite: itemSprite },
} satisfies RenderingControlsFor<'itemUses'>;

export const itemUses = {
  rendering,
  levels: {
    2: {
      ...controls,
      minimumEffectSimilarity: 0,
      maximumEffectSimilarity: 0.35,
      preferSimilarEffects: false,
      response: responsePresets.single,
    },
    3: {
      ...controls,
      sameItemCategory: true,
      minimumEffectSimilarity: 0,
      maximumEffectSimilarity: 0.8,
      preferSimilarEffects: false,
      response: responsePresets.single,
    },
    4: {
      ...controls,
      sameItemCategory: true,
      minimumEffectSimilarity: 0.3,
      maximumEffectSimilarity: 0.8,
      preferSimilarEffects: true,
      response: responsePresets.single,
    },
    5: {
      ...controls,
      rendering: { subject: { name: 'after-answer' } },
      sameItemCategory: true,
      minimumEffectSimilarity: 0.5,
      maximumEffectSimilarity: 0.8,
      preferSimilarEffects: true,
      useFullEffectText: true,
      allowMissingSprites: false,
      response: responsePresets.single,
    },
  },
} satisfies QuestionRuleRow<FamilyRules['itemUses'], 'itemUses'>;
