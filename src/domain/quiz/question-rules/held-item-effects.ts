import type { FamilyRules } from '../questions/family-rules.ts';
import type {
  QuestionControlsFor,
  QuestionRuleRow,
  RenderingControlsFor,
} from './types.ts';
import { itemSprite, responsePresets } from './shared.ts';

const controls = {
  view: { answer: { kind: 'text', layout: 'statements' } },
  minimumEffectSimilarity: 0,
  maximumEffectSimilarity: 0.35,
  preferSimilarEffects: true,
  useFullEffectText: false,
  sameItemCategory: false,
  allowMissingSprites: false,
} as const satisfies QuestionControlsFor<'heldItemEffects'>;

const rendering = {
  subject: { sprite: itemSprite },
} satisfies RenderingControlsFor<'heldItemEffects'>;

export const heldItemEffects = {
  rendering,
  levels: {
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
      sameItemCategory: true,
      minimumEffectSimilarity: 0.5,
      maximumEffectSimilarity: 0.8,
      preferSimilarEffects: true,
      useFullEffectText: true,
      allowMissingSprites: true,
      response: responsePresets.single,
    },
  },
} satisfies QuestionRuleRow<FamilyRules['heldItemEffects'], 'heldItemEffects'>;
