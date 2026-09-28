import type { FamilyRules } from '../questions/family-rules.ts';
import type { QuestionRuleRow } from './types.ts';
import { itemIdentification } from './item-identification.ts';
import { itemUses } from './item-uses.ts';
import { weightComparison } from './weight-comparison.ts';
import { heightComparison } from './height-comparison.ts';
import { moveTypes } from './move-types.ts';
import { locationRegion } from './location-region.ts';
import { moveCategory } from './move-category.ts';
import { pokedexCategories } from './pokedex-categories.ts';
import { evolutionConditions } from './evolution-conditions.ts';
import { abilityEffects } from './ability-effects.ts';
import { heldItemEffects } from './held-item-effects.ts';
import { hiddenAbilities } from './hidden-abilities.ts';
import { natureEffects } from './nature-effects.ts';
import { evYields } from './ev-yields.ts';
import { encounterLocations } from './encounter-locations.ts';
import { berryFlavors } from './berry-flavors.ts';
import { naturalGift } from './natural-gift.ts';
import { pokemonFromHistoricalSprite } from './pokemon-from-historical-sprite.ts';
import { spriteForPokemon } from './sprite-for-pokemon.ts';
import { silhouetteForPokemon } from './silhouette-for-pokemon.ts';
import { pokemonFromSilhouette } from './pokemon-from-silhouette.ts';
import { pokemonFromPixelCrop } from './pokemon-from-pixel-crop.ts';
import { shinyPokemonIdentification } from './shiny-pokemon-identification.ts';
import { pokedexEntryMatch } from './pokedex-entry-match.ts';
import { pokemonTypes } from './pokemon-types.ts';
import { typeOddOneOut } from './type-odd-one-out.ts';
import { pokemonByType } from './pokemon-by-type.ts';
import { dualTypeMatch } from './dual-type-match.ts';
import { legendaryMythicalSelection } from './legendary-mythical-selection.ts';
import { pokemonByGeneration } from './pokemon-by-generation.ts';
import { evolutionChain } from './evolution-chain.ts';
import { evolutionGainedType } from './evolution-gained-type.ts';
import { pokemonAbilities } from './pokemon-abilities.ts';
import { levelUpMoves } from './level-up-moves.ts';
import { statExtremes } from './stat-extremes.ts';
import { typeMatchup } from './type-matchup.ts';
import { superEffectiveAttacker } from './super-effective-attacker.ts';
import { champion } from './champion.ts';

/** Complete typed registry of question-family rules. */
export const questionRules = {
  itemIdentification,
  itemUses,
  weightComparison,
  heightComparison,
  moveTypes,
  locationRegion,
  moveCategory,
  pokedexCategories,
  evolutionConditions,
  abilityEffects,
  heldItemEffects,
  hiddenAbilities,
  natureEffects,
  evYields,
  encounterLocations,
  berryFlavors,
  naturalGift,
  pokemonFromHistoricalSprite,
  spriteForPokemon,
  silhouetteForPokemon,
  pokemonFromSilhouette,
  pokemonFromPixelCrop,
  shinyPokemonIdentification,
  pokedexEntryMatch,
  pokemonTypes,
  typeOddOneOut,
  pokemonByType,
  dualTypeMatch,
  legendaryMythicalSelection,
  pokemonByGeneration,
  evolutionChain,
  evolutionGainedType,
  pokemonAbilities,
  levelUpMoves,
  statExtremes,
  typeMatchup,
  superEffectiveAttacker,
  champion,
} satisfies {
  [Type in keyof FamilyRules]: QuestionRuleRow<FamilyRules[Type], Type>;
};
