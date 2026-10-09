import type { FamilyRule } from '../questions/family-rules.ts';
import type {
  QuestionControls,
  QuestionRuleRow,
  RenderingControls,
} from './types.ts';
import { frontSprite, responsePresets } from './shared.ts';

export type Rules = FamilyRule<
  {
    /** Prefer wrong abilities found on Pokémon sharing a target type. */
    plausibleProperties: boolean;
  },
  'text',
  'single'
>;

export type Rendering = RenderingControls<
  'sprite' | 'name' | 'number' | 'types'
>;

const controls = {
  view: { answer: { kind: 'text' } },
  plausibleProperties: false,
} satisfies QuestionControls<Rules>;

const rendering = {
  subject: { sprite: frontSprite },
} satisfies Rendering;

export const pokemonAbilities = {
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
