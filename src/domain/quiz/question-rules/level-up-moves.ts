import type { FamilyRules } from '../questions/family-rules.ts';
import type {
  QuestionControlsFor,
  QuestionRuleRow,
  RenderingControlsFor,
} from './types.ts';
import { frontSprite, responsePresets } from './shared.ts';

const controls = {
  view: { answer: { kind: 'move' } },
  plausibleProperties: false,
} as const satisfies QuestionControlsFor<'levelUpMoves'>;

const rendering = {
  subject: { sprite: frontSprite },
  choices: { types: 'after-answer' },
} satisfies RenderingControlsFor<'levelUpMoves'>;

export const levelUpMoves = {
  rendering,
  levels: {
    4: {
      ...controls,
      response: responsePresets.single,
    },
    5: {
      ...controls,
      plausibleProperties: true,
      response: responsePresets.single,
    },
  },
} satisfies QuestionRuleRow<FamilyRules['levelUpMoves'], 'levelUpMoves'>;
