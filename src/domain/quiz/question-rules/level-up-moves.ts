import type { FamilyRule } from '../questions/family-rules.ts';
import type {
  QuestionControls,
  QuestionRuleRow,
  RenderingControls,
} from './types.ts';
import { frontSprite, responsePresets } from './shared.ts';

export type Rules = FamilyRule<
  {
    /** Prefer wrong moves learned by Pokémon sharing a target type. */
    plausibleProperties: boolean;
  },
  'move',
  'single'
>;

export type Rendering = RenderingControls<
  'sprite' | 'name' | 'number' | 'types',
  'types'
>;

const controls = {
  view: { answer: { kind: 'move' } },
  plausibleProperties: false,
} satisfies QuestionControls<Rules>;

const rendering = {
  subject: { sprite: frontSprite },
  choices: { types: 'after-answer' },
} satisfies Rendering;

export const levelUpMoves = {
  rendering,
  pokemonSprites: ['subject'],
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
} satisfies QuestionRuleRow<Rules, Rendering>;
