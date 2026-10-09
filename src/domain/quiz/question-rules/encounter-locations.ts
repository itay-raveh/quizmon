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
    /** Include time- and weather-dependent encounter records. */
    encounterConditions: boolean;
    /** Rank wrong Pokémon by encounter method and similarity. */
    closeAlternatives: boolean;
    /** Similarity coefficients for wrong Pokémon. */
    similarityWeights: SimilarityWeights;
    /** Extra rank points for a wrong Pokémon using the same encounter method. */
    sameEncounterMethodWeight: number;
  },
  'pokemon',
  'single' | 'multi'
>;

export type Rendering = { choices?: PokemonChoices };

const controls = {
  view: { answer: { kind: 'pokemon' } },
  sameEncounterMethodWeight: 100,
} satisfies QuestionControls<Rules>;

export const encounterLocations = {
  pokemonSprites: ['choices'],
  levels: {
    4: {
      ...controls,
      response: responsePresets.single,
    },
    5: {
      ...controls,
      encounterConditions: true,
      closeAlternatives: true,
      response: responsePresets.multi,
    },
  },
} satisfies QuestionRuleRow<Rules, Rendering>;
