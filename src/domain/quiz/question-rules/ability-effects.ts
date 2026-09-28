import type { FamilyRules } from '../questions/family-rules.ts';
import type {
  QuestionControlsFor,
  QuestionRuleRow,
  RenderingControlsFor,
} from './types.ts';
import { responsePresets } from './shared.ts';

const controls = {
  view: { answer: { kind: 'text' }, subject: { inlineItem: 'sprite' } },
  minimumEffectSimilarity: 0,
  maximumEffectSimilarity: 0.35,
  preferSimilarEffects: true,
  useFullEffectText: false,
  allowMissingSprites: false,
} as const satisfies QuestionControlsFor<'abilityEffects'>;

const rendering = {} satisfies RenderingControlsFor<'abilityEffects'>;

export const abilityEffects = {
  rendering,
  levels: {
    3: {
      ...controls,
      minimumEffectSimilarity: 0,
      maximumEffectSimilarity: 0.35,
      preferSimilarEffects: false,
      response: responsePresets.single,
    },
    4: {
      ...controls,
      minimumEffectSimilarity: 0,
      maximumEffectSimilarity: 0.35,
      preferSimilarEffects: true,
      response: responsePresets.single,
    },
    5: {
      ...controls,
      minimumEffectSimilarity: 0,
      maximumEffectSimilarity: 0.35,
      preferSimilarEffects: true,
      allowMissingSprites: true,
      response: {
        kind: 'search',
        selection: 'single',
        candidates: 'provided',
      },
    },
  },
} satisfies QuestionRuleRow<FamilyRules['abilityEffects'], 'abilityEffects'>;
