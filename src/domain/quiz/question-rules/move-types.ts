import type { FamilyRules } from '../questions/family-rules.ts';
import type {
  QuestionControlsFor,
  QuestionRuleRow,
  RenderingControlsFor,
} from './types.ts';
import { responsePresets } from './shared.ts';

const controls = {
  view: { answer: { kind: 'type' } },
  showMoveDescription: false,
  allOptions: false,
  excludeTypeHintNames: false,
} as const satisfies QuestionControlsFor<'moveTypes'>;

const rendering = {} satisfies RenderingControlsFor<'moveTypes'>;

export const moveTypes = {
  rendering,
  levels: {
    2: {
      ...controls,
      showMoveDescription: true,
      response: responsePresets.single,
    },
    3: {
      ...controls,
      allOptions: true,
      excludeTypeHintNames: true,
      response: responsePresets.shortSingle,
    },
  },
} satisfies QuestionRuleRow<FamilyRules['moveTypes'], 'moveTypes'>;
