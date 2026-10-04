import type { FamilyRules } from '../questions/family-rules.ts';
import type {
  QuestionControlsFor,
  QuestionRuleRow,
  RenderingControlsFor,
} from './types.ts';
import { frontSprite, responsePresets } from './shared.ts';

const controls = {
  view: { answer: { kind: 'text' } },
  completeEvYield: false,
  closeAlternatives: false,
} as const satisfies QuestionControlsFor<'evYields'>;

const rendering = {
  subject: { sprite: frontSprite },
} satisfies RenderingControlsFor<'evYields'>;

export const evYields = {
  active: false,
  rendering,
  levels: {
    4: {
      ...controls,
      completeEvYield: false,
      response: responsePresets.single,
    },
    5: {
      ...controls,
      completeEvYield: true,
      closeAlternatives: true,
      response: responsePresets.single,
    },
  },
} satisfies QuestionRuleRow<FamilyRules['evYields'], 'evYields'>;
