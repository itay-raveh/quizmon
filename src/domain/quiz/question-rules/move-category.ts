import type { FamilyRules } from '../questions/family-rules.ts';
import type {
  QuestionControlsFor,
  QuestionRuleRow,
  RenderingControlsFor,
} from './types.ts';
import { responsePresets } from './shared.ts';

const controls = {
  view: { answer: { kind: 'move' } },
  statusMovesOnly: false,
  sameMoveType: false,
} as const satisfies QuestionControlsFor<'moveCategory'>;

const rendering = {
  choices: { types: 'after-answer' },
} satisfies RenderingControlsFor<'moveCategory'>;

export const moveCategory = {
  rendering,
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
    5: null,
  },
} satisfies QuestionRuleRow<FamilyRules['moveCategory'], 'moveCategory'>;
