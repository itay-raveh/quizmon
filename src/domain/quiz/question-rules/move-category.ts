import type { FamilyRules } from '../questions/family-rules.ts';
import type {
  QuestionControlsFor,
  QuestionRuleRow,
  RenderingControlsFor,
} from './types.ts';
import { responsePresets } from './shared.ts';

const controls = {
  view: { answer: { kind: 'text', detail: 'move' } },
  statusMovesOnly: false,
  sameMoveType: false,
} as const satisfies QuestionControlsFor<'moveCategory'>;

const rendering = {} satisfies RenderingControlsFor<'moveCategory'>;

export const moveCategory = {
  rendering,
  lastLevel: 4,
  levels: {
    3: {
      ...controls,
      statusMovesOnly: false,
      response: responsePresets.single,
    },
    4: {
      ...controls,
      statusMovesOnly: false,
      sameMoveType: true,
      response: responsePresets.single,
    },
  },
} satisfies QuestionRuleRow<FamilyRules['moveCategory'], 'moveCategory'>;
