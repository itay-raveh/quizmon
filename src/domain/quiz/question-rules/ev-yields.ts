import type { FamilyRule } from '../questions/family-rules.ts';
import type {
  QuestionControls,
  QuestionRuleRow,
  RenderingControls,
} from './types.ts';
import { frontSprite, responsePresets } from './shared.ts';

export type Rules = FamilyRule<
  {
    /** Ask for the full EV yield instead of one boosted stat. */
    completeEvYield: boolean;
    /** Rank wrong full-yield answers by total EV distance. */
    closeAlternatives: boolean;
  },
  'text',
  'single'
>;

export type Rendering = RenderingControls<
  'sprite' | 'name' | 'number' | 'types'
>;

const controls = {
  view: { answer: { kind: 'text' } },
  completeEvYield: false,
} satisfies QuestionControls<Rules>;

const rendering = {
  subject: { sprite: frontSprite },
} satisfies Rendering;

export const evYields = {
  active: false,
  rendering,
  pokemonSprites: ['subject'],
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
} satisfies QuestionRuleRow<Rules, Rendering>;
