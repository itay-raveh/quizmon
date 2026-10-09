import type { FamilyRule } from '../questions/family-rules.ts';
import type {
  QuestionControls,
  QuestionRuleRow,
  RenderingControls,
} from './types.ts';
import { responsePresets } from './shared.ts';

export type Rules = FamilyRule<
  {
    /** Ask only about status moves. */
    statusMovesOnly: boolean;
    /** Choose wrong moves with the same type as the target. */
    sameMoveType: boolean;
  },
  'move',
  'single'
>;

export type Rendering = RenderingControls<never, 'types'>;

const controls = {
  view: { answer: { kind: 'move' } },
  statusMovesOnly: false,
  sameMoveType: false,
} satisfies QuestionControls<Rules>;

const rendering = {
  choices: { types: 'after-answer' },
} satisfies Rendering;

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
} satisfies QuestionRuleRow<Rules, Rendering>;
