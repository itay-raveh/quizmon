import type { QuestionRendering } from '../rendering.ts';
import type { QuestionView } from '../presentation.ts';
import type { ResponseStrategy } from './response-strategies.ts';
import type { Rules as ItemIdentificationRules } from '../question-rules/item-identification.ts';
import type { Rules as ItemUsesRules } from '../question-rules/item-uses.ts';
import type { Rules as WeightComparisonRules } from '../question-rules/weight-comparison.ts';
import type { Rules as HeightComparisonRules } from '../question-rules/height-comparison.ts';
import type { Rules as MoveTypesRules } from '../question-rules/move-types.ts';
import type { Rules as LocationRegionRules } from '../question-rules/location-region.ts';
import type { Rules as MoveCategoryRules } from '../question-rules/move-category.ts';
import type { Rules as PokedexCategoriesRules } from '../question-rules/pokedex-categories.ts';
import type { Rules as EvolutionConditionsRules } from '../question-rules/evolution-conditions.ts';
import type { Rules as AbilityEffectsRules } from '../question-rules/ability-effects.ts';
import type { Rules as HeldItemEffectsRules } from '../question-rules/held-item-effects.ts';
import type { Rules as HiddenAbilitiesRules } from '../question-rules/hidden-abilities.ts';
import type { Rules as NatureEffectsRules } from '../question-rules/nature-effects.ts';
import type { Rules as EvYieldsRules } from '../question-rules/ev-yields.ts';
import type { Rules as EncounterLocationsRules } from '../question-rules/encounter-locations.ts';
import type { Rules as BerryFlavorsRules } from '../question-rules/berry-flavors.ts';
import type { Rules as NaturalGiftRules } from '../question-rules/natural-gift.ts';
import type { Rules as PokemonIdentificationRules } from '../question-rules/pokemon-identification.ts';
import type { Rules as PokemonMatchRules } from '../question-rules/pokemon-match.ts';
import type { Rules as PokemonFromPixelCropRules } from '../question-rules/pokemon-from-pixel-crop.ts';
import type { Rules as ShinyPokemonIdentificationRules } from '../question-rules/shiny-pokemon-identification.ts';
import type { Rules as PokedexEntryMatchRules } from '../question-rules/pokedex-entry-match.ts';
import type { Rules as PokemonTypesRules } from '../question-rules/pokemon-types.ts';
import type { Rules as TypeOddOneOutRules } from '../question-rules/type-odd-one-out.ts';
import type { Rules as PokemonByTypeRules } from '../question-rules/pokemon-by-type.ts';
import type { Rules as DualTypeMatchRules } from '../question-rules/dual-type-match.ts';
import type { Rules as LegendaryMythicalSelectionRules } from '../question-rules/legendary-mythical-selection.ts';
import type { Rules as PokemonByGenerationRules } from '../question-rules/pokemon-by-generation.ts';
import type { Rules as EvolutionChainRules } from '../question-rules/evolution-chain.ts';
import type { Rules as EvolutionGainedTypeRules } from '../question-rules/evolution-gained-type.ts';
import type { Rules as PokemonAbilitiesRules } from '../question-rules/pokemon-abilities.ts';
import type { Rules as LevelUpMovesRules } from '../question-rules/level-up-moves.ts';
import type { Rules as StatExtremesRules } from '../question-rules/stat-extremes.ts';
import type { Rules as TypeMatchupRules } from '../question-rules/type-matchup.ts';
import type { Rules as SuperEffectiveAttackerRules } from '../question-rules/super-effective-attacker.ts';
import type { Rules as ChampionRules } from '../question-rules/champion.ts';

type ChoiceResponse = Extract<ResponseStrategy, { kind: 'picker' }>;
export type SearchResponse<Candidates extends 'pool' | 'provided'> =
  | ChoiceResponse
  | { kind: 'search'; selection: 'single'; candidates: Candidates };
export type TypeSearchResponse<
  Correct extends 'subject-types' | 'effectiveness',
> =
  | ChoiceResponse
  | {
      kind: 'search';
      selection: 'multi';
      candidates: 'types';
      correct: Correct;
    };
export type SimilarityWeights = {
  /** Maximum type-overlap points, normalized by the union of both type sets. */
  type: number;
  shape: number;
  color: number;
  evolutionStage: number;
  /** Bounded similarity of front-reference alpha-bound width/height ratios. */
  proportions: number;
  /** Optional weak similarity of official physical heights; never changes sprite size. */
  height: number;
};

export interface PokemonDistractors {
  /** Allow the target’s evolution family, including branches, among wrong choices. */
  allowEvolutionRelatives: boolean;
  /** On a short pool, use a similarity band or keep the fixed shortlist. */
  smallPoolPolicy: 'semantic-band' | 'fixed-size';
  /** Rank candidates toward or away from the target's similarity score. */
  distractorRankDirection: 'most-similar' | 'least-similar';
  /** Candidate species groups shortlisted before selecting three distractors. */
  distractorPoolSize: number;
  /** Minimum score as a fraction of the best score in a short semantic band. */
  smallPoolSimilarityRatio: number;
  /** Fraction of shortlisted groups farthest away by species ID. */
  distantSpeciesFraction: number;
  /** Coefficients used by the shared Pokémon similarity scorer. */
  similarityWeights: SimilarityWeights;
  /** Role whose sampled appearance governs visual distractor ranking. */
  similarityRole?: 'subject' | 'choices';
  /** Simple overrides for a concealed image; color cannot contribute. */
  silhouetteWeights?: Partial<Omit<SimilarityWeights, 'color'>> & { color?: 0 };
}

export interface EffectDistractors {
  /** Inclusive lower bound on description similarity for wrong effects. */
  minimumEffectSimilarity: number;
  /** Exclusive upper bound on description similarity for wrong effects. */
  maximumEffectSimilarity: number;
  /** Sort eligible wrong effects from most to least similar. */
  preferSimilarEffects: boolean;
  /** Display complete effect explanations instead of short effect text. */
  useFullEffectText: boolean;
}

export type EffectRules = EffectDistractors & {
  /** Permit targets without a sprite. */
  allowMissingSprites: boolean;
  /** Keep wrong items in the target's category when applicable. */
  sameItemCategory?: boolean;
  /** Search uses the builder's supplied candidate list. */
  response: SearchResponse<'provided'>;
};

export type NoControls = object;

/** Resolved builder input; family modules own their controls and answer kinds. */
export type FamilyRule<
  Controls,
  AnswerKind extends QuestionView['answer']['kind'],
  Selection extends ChoiceResponse['selection'],
> = Omit<Controls, 'response'> & {
  response: Controls extends { response: infer Strategy }
    ? Strategy extends ChoiceResponse
      ? Strategy & { selection: Selection }
      : Strategy
    : ChoiceResponse & { selection: Selection };
  rendering: QuestionRendering;
  view: Omit<QuestionView, 'answer'> & {
    answer: Extract<QuestionView['answer'], { kind: AnswerKind }>;
  };
};

/** Aggregate the configuration types exported by their owning families. */
export type FamilyRules = {
  itemIdentification: ItemIdentificationRules;
  itemUses: ItemUsesRules;
  weightComparison: WeightComparisonRules;
  heightComparison: HeightComparisonRules;
  moveTypes: MoveTypesRules;
  locationRegion: LocationRegionRules;
  moveCategory: MoveCategoryRules;
  pokedexCategories: PokedexCategoriesRules;
  evolutionConditions: EvolutionConditionsRules;
  abilityEffects: AbilityEffectsRules;
  heldItemEffects: HeldItemEffectsRules;
  hiddenAbilities: HiddenAbilitiesRules;
  natureEffects: NatureEffectsRules;
  evYields: EvYieldsRules;
  encounterLocations: EncounterLocationsRules;
  berryFlavors: BerryFlavorsRules;
  naturalGift: NaturalGiftRules;
  pokemonIdentification: PokemonIdentificationRules;
  pokemonMatch: PokemonMatchRules;
  pokemonFromPixelCrop: PokemonFromPixelCropRules;
  shinyPokemonIdentification: ShinyPokemonIdentificationRules;
  pokedexEntryMatch: PokedexEntryMatchRules;
  pokemonTypes: PokemonTypesRules;
  typeOddOneOut: TypeOddOneOutRules;
  pokemonByType: PokemonByTypeRules;
  dualTypeMatch: DualTypeMatchRules;
  legendaryMythicalSelection: LegendaryMythicalSelectionRules;
  pokemonByGeneration: PokemonByGenerationRules;
  evolutionChain: EvolutionChainRules;
  evolutionGainedType: EvolutionGainedTypeRules;
  pokemonAbilities: PokemonAbilitiesRules;
  levelUpMoves: LevelUpMovesRules;
  statExtremes: StatExtremesRules;
  typeMatchup: TypeMatchupRules;
  superEffectiveAttacker: SuperEffectiveAttackerRules;
  champion: ChampionRules;
};
