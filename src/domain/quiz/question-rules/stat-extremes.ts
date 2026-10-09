import type { FamilyRule } from '../questions/family-rules.ts';
import type {
  QuestionControls,
  QuestionRuleRow,
  PokemonChoices,
} from './types.ts';
import { responsePresets } from './shared.ts';

export type Rules = FamilyRule<
  {
    /** Inclusive allowed stat-point gap to each wrong Pokémon; null disables it. */
    statGap: readonly [number, number] | null;
  },
  'pokemon',
  'single'
>;

export type Rendering = { choices?: PokemonChoices };

const controls = {
  view: { answer: { kind: 'pokemon' } },
  statGap: null,
} satisfies QuestionControls<Rules>;

export const statExtremes = {
  pokemonSprites: ['choices'],
  levels: {
    3: {
      ...controls,
      statGap: [41, Infinity],
      response: responsePresets.single,
    },
    4: {
      ...controls,
      statGap: [21, 40],
      response: responsePresets.single,
    },
    5: {
      ...controls,
      statGap: [10, 20],
      response: responsePresets.single,
    },
  },
} satisfies QuestionRuleRow<Rules, Rendering>;
