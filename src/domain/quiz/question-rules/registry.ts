import type { FamilyRules } from '../questions/family-rules.ts';
import type { QuestionRuleRow } from './types.ts';
import {
  itemIdentification,
  type Rendering as ItemIdentificationRendering,
} from './item-identification.ts';
import { itemUses, type Rendering as ItemUsesRendering } from './item-uses.ts';
import {
  weightComparison,
  type Rendering as WeightComparisonRendering,
} from './weight-comparison.ts';
import {
  heightComparison,
  type Rendering as HeightComparisonRendering,
} from './height-comparison.ts';
import {
  moveTypes,
  type Rendering as MoveTypesRendering,
} from './move-types.ts';
import {
  locationRegion,
  type Rendering as LocationRegionRendering,
} from './location-region.ts';
import {
  moveCategory,
  type Rendering as MoveCategoryRendering,
} from './move-category.ts';
import {
  pokedexCategories,
  type Rendering as PokedexCategoriesRendering,
} from './pokedex-categories.ts';
import {
  evolutionConditions,
  type Rendering as EvolutionConditionsRendering,
} from './evolution-conditions.ts';
import {
  abilityEffects,
  type Rendering as AbilityEffectsRendering,
} from './ability-effects.ts';
import {
  heldItemEffects,
  type Rendering as HeldItemEffectsRendering,
} from './held-item-effects.ts';
import {
  hiddenAbilities,
  type Rendering as HiddenAbilitiesRendering,
} from './hidden-abilities.ts';
import {
  natureEffects,
  type Rendering as NatureEffectsRendering,
} from './nature-effects.ts';
import { evYields, type Rendering as EvYieldsRendering } from './ev-yields.ts';
import {
  encounterLocations,
  type Rendering as EncounterLocationsRendering,
} from './encounter-locations.ts';
import {
  berryFlavors,
  type Rendering as BerryFlavorsRendering,
} from './berry-flavors.ts';
import {
  naturalGift,
  type Rendering as NaturalGiftRendering,
} from './natural-gift.ts';
import {
  pokemonIdentification,
  type Rendering as PokemonIdentificationRendering,
} from './pokemon-identification.ts';
import {
  pokemonMatch,
  type Rendering as PokemonMatchRendering,
} from './pokemon-match.ts';
import {
  pokemonFromPixelCrop,
  type Rendering as PokemonFromPixelCropRendering,
} from './pokemon-from-pixel-crop.ts';
import {
  shinyPokemonIdentification,
  type Rendering as ShinyPokemonIdentificationRendering,
} from './shiny-pokemon-identification.ts';
import {
  pokedexEntryMatch,
  type Rendering as PokedexEntryMatchRendering,
} from './pokedex-entry-match.ts';
import {
  pokemonTypes,
  type Rendering as PokemonTypesRendering,
} from './pokemon-types.ts';
import {
  typeOddOneOut,
  type Rendering as TypeOddOneOutRendering,
} from './type-odd-one-out.ts';
import {
  pokemonByType,
  type Rendering as PokemonByTypeRendering,
} from './pokemon-by-type.ts';
import {
  dualTypeMatch,
  type Rendering as DualTypeMatchRendering,
} from './dual-type-match.ts';
import {
  legendaryMythicalSelection,
  type Rendering as LegendaryMythicalSelectionRendering,
} from './legendary-mythical-selection.ts';
import {
  pokemonByGeneration,
  type Rendering as PokemonByGenerationRendering,
} from './pokemon-by-generation.ts';
import {
  evolutionChain,
  type Rendering as EvolutionChainRendering,
} from './evolution-chain.ts';
import {
  evolutionGainedType,
  type Rendering as EvolutionGainedTypeRendering,
} from './evolution-gained-type.ts';
import {
  pokemonAbilities,
  type Rendering as PokemonAbilitiesRendering,
} from './pokemon-abilities.ts';
import {
  levelUpMoves,
  type Rendering as LevelUpMovesRendering,
} from './level-up-moves.ts';
import {
  statExtremes,
  type Rendering as StatExtremesRendering,
} from './stat-extremes.ts';
import {
  typeMatchup,
  type Rendering as TypeMatchupRendering,
} from './type-matchup.ts';
import {
  superEffectiveAttacker,
  type Rendering as SuperEffectiveAttackerRendering,
} from './super-effective-attacker.ts';
import { champion, type Rendering as ChampionRendering } from './champion.ts';

export type FamilyRendering = {
  itemIdentification: ItemIdentificationRendering;
  itemUses: ItemUsesRendering;
  weightComparison: WeightComparisonRendering;
  heightComparison: HeightComparisonRendering;
  moveTypes: MoveTypesRendering;
  locationRegion: LocationRegionRendering;
  moveCategory: MoveCategoryRendering;
  pokedexCategories: PokedexCategoriesRendering;
  evolutionConditions: EvolutionConditionsRendering;
  abilityEffects: AbilityEffectsRendering;
  heldItemEffects: HeldItemEffectsRendering;
  hiddenAbilities: HiddenAbilitiesRendering;
  natureEffects: NatureEffectsRendering;
  evYields: EvYieldsRendering;
  encounterLocations: EncounterLocationsRendering;
  berryFlavors: BerryFlavorsRendering;
  naturalGift: NaturalGiftRendering;
  pokemonIdentification: PokemonIdentificationRendering;
  pokemonMatch: PokemonMatchRendering;
  pokemonFromPixelCrop: PokemonFromPixelCropRendering;
  shinyPokemonIdentification: ShinyPokemonIdentificationRendering;
  pokedexEntryMatch: PokedexEntryMatchRendering;
  pokemonTypes: PokemonTypesRendering;
  typeOddOneOut: TypeOddOneOutRendering;
  pokemonByType: PokemonByTypeRendering;
  dualTypeMatch: DualTypeMatchRendering;
  legendaryMythicalSelection: LegendaryMythicalSelectionRendering;
  pokemonByGeneration: PokemonByGenerationRendering;
  evolutionChain: EvolutionChainRendering;
  evolutionGainedType: EvolutionGainedTypeRendering;
  pokemonAbilities: PokemonAbilitiesRendering;
  levelUpMoves: LevelUpMovesRendering;
  statExtremes: StatExtremesRendering;
  typeMatchup: TypeMatchupRendering;
  superEffectiveAttacker: SuperEffectiveAttackerRendering;
  champion: ChampionRendering;
};

/** Complete typed registry of question-family rules. */
export const questionRules: {
  [Type in keyof FamilyRules]: QuestionRuleRow<
    FamilyRules[Type],
    FamilyRendering[Type]
  >;
} = {
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
  pokemonIdentification,
  pokemonMatch,
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
};
