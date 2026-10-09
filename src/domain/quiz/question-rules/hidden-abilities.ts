import type { FamilyRule } from '../questions/family-rules.ts';
import type {
  QuestionControls,
  QuestionRuleRow,
  RenderingControls,
} from './types.ts';
import { frontSprite, responsePresets } from './shared.ts';

export type Rules = FamilyRule<
  {
    /** Source wrong abilities from Pokémon sharing a target type. */
    sameTypeAbilityDistractors: boolean;
    /** Permit targets without a Pokémon sprite. */
    allowMissingSprites: boolean;
  },
  'text',
  'single'
>;

export type Rendering = RenderingControls<
  'sprite' | 'name' | 'number' | 'types'
>;

const controls = {
  view: { answer: { kind: 'text' } },
  sameTypeAbilityDistractors: false,
} satisfies QuestionControls<Rules>;

const rendering = {
  subject: { sprite: frontSprite },
} satisfies Rendering;

export const hiddenAbilities = {
  rendering,
  pokemonSprites: ['subject'],
  levels: {
    5: {
      ...controls,
      sameTypeAbilityDistractors: true,
      allowMissingSprites: true,
      response: responsePresets.single,
    },
  },
} satisfies QuestionRuleRow<Rules, Rendering>;
