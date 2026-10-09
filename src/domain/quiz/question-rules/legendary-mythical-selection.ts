import type { FamilyRule, NoControls } from '../questions/family-rules.ts';
import type {
  QuestionControls,
  QuestionRuleRow,
  PokemonChoices,
} from './types.ts';
import { responsePresets } from './shared.ts';

export type Rules = FamilyRule<NoControls, 'pokemon', 'multi'>;

export type Rendering = { choices?: PokemonChoices };

const controls = {
  view: { answer: { kind: 'pokemon' } },
} satisfies QuestionControls<Rules>;

export const legendaryMythicalSelection = {
  pokemonSprites: ['choices'],
  levels: {
    2: {
      ...controls,
      response: responsePresets.multi,
    },
    4: null,
  },
} satisfies QuestionRuleRow<Rules, Rendering>;
