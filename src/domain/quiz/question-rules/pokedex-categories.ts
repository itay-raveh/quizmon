import type {
  FamilyRule,
  SimilarityWeights,
} from '../questions/family-rules.ts';
import type {
  QuestionControls,
  QuestionRuleRow,
  PokemonChoices,
} from './types.ts';
import { responsePresets } from './shared.ts';

export type Rules = FamilyRule<
  {
    /** Require each wrong Pokémon to share the target's color or shape. */
    sameColorOrShape: boolean;
    /** Rank eligible wrong Pokémon by similarity before taking three. */
    closeAlternatives: boolean;
    /** Similarity coefficients for ranking wrong Pokémon. */
    similarityWeights: SimilarityWeights;
  },
  'pokemon',
  'single'
>;

export type Rendering = { choices?: PokemonChoices };

const controls = {
  view: { answer: { kind: 'pokemon' } },
} satisfies QuestionControls<Rules>;

export const pokedexCategories = {
  pokemonSprites: ['choices'],
  levels: {
    3: {
      ...controls,
      sameColorOrShape: true,
      response: responsePresets.single,
    },
    5: {
      ...controls,
      sameColorOrShape: true,
      closeAlternatives: true,
      response: responsePresets.single,
    },
  },
} satisfies QuestionRuleRow<Rules, Rendering>;
