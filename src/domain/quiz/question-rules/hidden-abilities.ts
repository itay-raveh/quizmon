import type { FamilyRules } from '../questions/family-rules.ts';
import type {
  QuestionControlsFor,
  QuestionRuleRow,
  RenderingControlsFor,
} from './types.ts';
import { frontSprite, responsePresets } from './shared.ts';

const controls = {
  view: { answer: { kind: 'text' } },
  sameTypeAbilityDistractors: false,
  allowMissingSprites: false,
} as const satisfies QuestionControlsFor<'hiddenAbilities'>;

const rendering = {
  subject: { sprite: frontSprite },
} satisfies RenderingControlsFor<'hiddenAbilities'>;

export const hiddenAbilities = {
  rendering,
  levels: {
    4: {
      ...controls,
      sameTypeAbilityDistractors: false,
      response: responsePresets.single,
    },
    5: {
      ...controls,
      sameTypeAbilityDistractors: true,
      allowMissingSprites: true,
      response: responsePresets.single,
    },
  },
} satisfies QuestionRuleRow<FamilyRules['hiddenAbilities'], 'hiddenAbilities'>;
