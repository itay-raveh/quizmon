import type { FamilyRule } from '../questions/family-rules.ts';
import type {
  QuestionControls,
  QuestionRuleRow,
  PokemonChoices,
} from './types.ts';
import { responsePresets } from './shared.ts';

export type Rules = FamilyRule<
  {
    /** Restrict candidates to Pokémon with exactly one type. */
    singleType: boolean;
  },
  'pokemon',
  'single'
>;

export type Rendering = { choices?: PokemonChoices };

const controls = {
  view: { answer: { kind: 'pokemon' } },
} satisfies QuestionControls<Rules>;

const rendering = {
  choices: { name: 'always', types: 'after-answer' },
} satisfies Rendering;

export const typeOddOneOut = {
  rendering,
  pokemonSprites: ['choices'],
  levels: {
    2: {
      ...controls,
      singleType: true,
      response: responsePresets.single,
    },
    3: {
      ...controls,
      response: responsePresets.single,
    },
    5: null,
  },
} satisfies QuestionRuleRow<Rules, Rendering>;
