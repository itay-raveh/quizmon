import type { FamilyRules } from '../questions/family-rules.ts';
import type {
  QuestionControlsFor,
  QuestionRuleRow,
  RenderingControlsFor,
} from './types.ts';
import { itemSprite, responsePresets } from './shared.ts';

const controls = {
  view: { answer: { kind: 'text' } },
} as const satisfies QuestionControlsFor<'berryFlavors'>;

const rendering = {
  subject: { sprite: itemSprite },
} satisfies RenderingControlsFor<'berryFlavors'>;

export const berryFlavors = {
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
} satisfies QuestionRuleRow<FamilyRules['berryFlavors'], 'berryFlavors'>;
