import type { FamilyRule } from '../questions/family-rules.ts';
import type {
  QuestionControls,
  QuestionRuleRow,
  RenderingControls,
} from './types.ts';
import { itemSprite, responsePresets } from './shared.ts';

export type Rules = FamilyRule<
  {
    /** Include the move's description in the prompt. */
    showMoveDescription: boolean;
    /** Offer every type instead of four sampled types. */
    allOptions: boolean;
    /** Skip move names that contain their answer type. */
    excludeTypeHintNames: boolean;
  },
  'type',
  'single'
>;

export type Rendering = RenderingControls<'sprite'>;

const controls = {
  view: { answer: { kind: 'type' } },
  showMoveDescription: false,
  allOptions: false,
  excludeTypeHintNames: false,
} satisfies QuestionControls<Rules>;

const rendering = {
  subject: { sprite: { ...itemSprite, reveal: 'after-answer' } },
} satisfies Rendering;

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
} satisfies QuestionRuleRow<Rules, Rendering>;
