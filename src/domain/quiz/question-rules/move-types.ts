import type { FamilyRules } from '../questions/family-rules.ts';
import type {
  QuestionControlsFor,
  QuestionRuleRow,
  RenderingControlsFor,
} from './types.ts';
import { itemSprite, responsePresets } from './shared.ts';

const controls = {
  view: { answer: { kind: 'type' } },
  showMoveDescription: false,
  allOptions: false,
  excludeTypeHintNames: false,
} as const satisfies QuestionControlsFor<'moveTypes'>;

const rendering = {
  subject: { sprite: { ...itemSprite, reveal: 'after-answer' } },
} satisfies RenderingControlsFor<'moveTypes'>;

export const moveTypes = {
  rendering,
  levels: {
    3: {
      ...controls,
      showMoveDescription: true,
      response: responsePresets.single,
    },
    4: {
      ...controls,
      allOptions: true,
      excludeTypeHintNames: true,
      response: responsePresets.shortSingle,
    },
    5: null,
  },
} satisfies QuestionRuleRow<FamilyRules['moveTypes'], 'moveTypes'>;
