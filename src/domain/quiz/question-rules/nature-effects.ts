import type { FamilyRules } from '../questions/family-rules.ts';
import type {
  QuestionControlsFor,
  QuestionRuleRow,
  RenderingControlsFor,
} from './types.ts';
import { responsePresets } from './shared.ts';

const controls = {
  view: { answer: { kind: 'text', detail: 'nature' } },
  shareNatureStat: false,
} as const satisfies QuestionControlsFor<'natureEffects'>;

const rendering = {} satisfies RenderingControlsFor<'natureEffects'>;

export const natureEffects = {
  rendering,
  levels: {
    4: {
      ...controls,
      shareNatureStat: false,
      response: responsePresets.single,
    },
    5: {
      ...controls,
      shareNatureStat: true,
      response: responsePresets.single,
    },
  },
} satisfies QuestionRuleRow<FamilyRules['natureEffects'], 'natureEffects'>;
