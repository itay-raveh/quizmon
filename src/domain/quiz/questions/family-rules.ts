import type { MeasurementRules } from '../measurement-comparison.ts';
import type { QuestionRendering } from '../rendering.ts';
import type { QuestionView } from '../presentation.ts';
import type { ResponseStrategy } from './response-strategies.ts';

type ChoiceResponse = Extract<ResponseStrategy, { kind: 'picker' }>;
type SearchResponse<Candidates extends 'pool' | 'provided'> =
  | ChoiceResponse
  | { kind: 'search'; selection: 'single'; candidates: Candidates };
type TypeSearchResponse<Correct extends 'subject-types' | 'effectiveness'> =
  | ChoiceResponse
  | {
      kind: 'search';
      selection: 'multi';
      candidates: 'types';
      correct: Correct;
    };
export type SimilarityWeights = {
  /** Points per type shared with the target. */
  sharedType: number;
  /** Points when target and candidate have the same shape. */
  shape: number;
  /** Points when target and candidate have the same color. */
  color: number;
  /** Points when target and candidate debuted in the same generation. */
  generation: number;
  /** Points when both occupy the same evolution stage. */
  evolutionStage: number;
  /** Maximum stat-proximity points before stat difference is subtracted. */
  statMaximum: number;
  /** Divisor for the absolute difference in total base stats. */
  statScale: number;
};

export interface PokemonDistractors {
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
}

interface EffectDistractors {
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

type NoControls = object;

interface FamilyControls {
  itemIdentification: {
    /** Require wrong items from different categories. */
    distinctItemCategories: boolean;
    /** Restrict wrong items to the target's bag pocket. */
    sameItemPocket: boolean;
    /** Restrict wrong items to the target's pocket and category. */
    sameItemCategory: boolean;
    /** Search uses item names supplied by the builder. */
    response: SearchResponse<'provided'>;
  };
  itemUses: EffectDistractors & {
    /** Restrict wrong effects to items in the target's category. */
    sameItemCategory: boolean;
    /** Permit targets without an item sprite. */
    allowMissingSprites: boolean;
  };
  weightComparison: {
    /** Ratio and spread limits for four Pokémon weights. */
    measurement: MeasurementRules;
  };
  heightComparison: {
    /** Ratio and spread limits for four Pokémon heights. */
    measurement: MeasurementRules;
  };
  moveTypes: {
    /** Include the move's description in the prompt. */
    showMoveDescription: boolean;
    /** Offer every type instead of four sampled types. */
    allOptions: boolean;
    /** Skip move names that contain their answer type. */
    excludeTypeHintNames: boolean;
  };
  locationRegion: {
    /** Offer every eligible region instead of four sampled regions. */
    allOptions: boolean;
  };
  moveCategory: {
    /** Ask only about status moves. */
    statusMovesOnly: boolean;
    /** Choose wrong moves with the same type as the target. */
    sameMoveType: boolean;
  };
  pokedexCategories: {
    /** Require each wrong Pokémon to share the target's color or shape. */
    sameColorOrShape: boolean;
    /** Rank eligible wrong Pokémon by similarity before taking three. */
    closeAlternatives: boolean;
    /** Similarity coefficients for ranking wrong Pokémon. */
    similarityWeights: SimilarityWeights;
  };
  evolutionConditions: {
    /** Minimum distinct true conditions required for a target. */
    minimumEvolutionConditions: number;
    /** Keep numeric levels and other exact values in condition labels. */
    exactEvolutionValues: boolean;
    /** Allow exact level labels without enabling other exact values. */
    mixedLevelEvolutionConditions: boolean;
    /** Shorten condition labels, such as `Trade this Pokémon` to `Trade`. */
    compactEvolutionLabels: boolean;
    /** Chance of asking for an exact evolution level when eligible. */
    exactLevelQuestionChance: number;
    /** Include directly used evolution items as conditions. */
    directEvolutionItems: boolean;
    /** Include location-dependent evolution conditions. */
    evolutionLocations: boolean;
    /** Favor numerically nearby wrong condition values. */
    preferCloseConditionValues: boolean;
    /** Permit targets without a Pokémon sprite. */
    allowMissingSprites: boolean;
  };
  abilityEffects: EffectDistractors & {
    /** Permit targets without a sprite. */
    allowMissingSprites: boolean;
    /** Search uses ability names supplied by the builder. */
    response: SearchResponse<'provided'>;
  };
  heldItemEffects: EffectDistractors & {
    /** Restrict wrong effects to items in the target's category. */
    sameItemCategory: boolean;
    /** Permit targets without an item sprite. */
    allowMissingSprites: boolean;
  };
  hiddenAbilities: {
    /** Source wrong abilities from Pokémon sharing a target type. */
    sameTypeAbilityDistractors: boolean;
    /** Permit targets without a Pokémon sprite. */
    allowMissingSprites: boolean;
  };
  natureEffects: {
    /** Choose wrong natures that share a raised or lowered stat. */
    shareNatureStat: boolean;
  };
  evYields: {
    /** Ask for the full EV yield instead of one boosted stat. */
    completeEvYield: boolean;
    /** Rank wrong full-yield answers by total EV distance. */
    closeAlternatives: boolean;
  };
  encounterLocations: {
    /** Include time- and weather-dependent encounter records. */
    encounterConditions: boolean;
    /** Rank wrong Pokémon by encounter method and similarity. */
    closeAlternatives: boolean;
    /** Similarity coefficients for wrong Pokémon. */
    similarityWeights: SimilarityWeights;
    /** Extra rank points for a wrong Pokémon using the same encounter method. */
    sameEncounterMethodWeight: number;
  };
  berryFlavors: NoControls;
  naturalGift: NoControls;
  pokemonFromHistoricalSprite: PokemonDistractors & {
    /** Probability of showing the current sprite instead of a historical one. */
    currentSpriteChance: number;
    /** Probability of taking a back sprite before sampling a generation. */
    backSpriteChance: number;
    /** Chance of preferring a front sprite within a sampled generation. */
    frontSpriteChance: number;
    /** Search uses the current eligible Pokémon pool. */
    response: SearchResponse<'pool'>;
  };
  spriteForPokemon: PokemonDistractors;
  silhouetteForPokemon: PokemonDistractors;
  pokemonFromSilhouette: PokemonDistractors & {
    /** Search uses the current eligible Pokémon pool. */
    response: SearchResponse<'pool'>;
  };
  pokemonFromPixelCrop: PokemonDistractors & {
    /** Search uses the current eligible Pokémon pool. */
    response: SearchResponse<'pool'>;
    /** Multiplier applied to the generated pixel-crop zoom. */
    cropScale: number;
  };
  shinyPokemonIdentification: PokemonDistractors;
  pokedexEntryMatch: PokemonDistractors & {
    /** Search uses the current eligible Pokémon pool. */
    response: SearchResponse<'pool'>;
  };
  pokemonTypes: {
    /** Restrict targets to Pokémon with exactly one type. */
    singleType: boolean;
    /** Search for every type of the subject. */
    response: TypeSearchResponse<'subject-types'>;
    /** Score types by their closest Pokémon to rank wrong answers. */
    similarityWeights: SimilarityWeights;
  };
  typeOddOneOut: {
    /** Restrict candidates to Pokémon with exactly one type. */
    singleType: boolean;
  };
  pokemonByType: {
    /** Restrict candidates to Pokémon with exactly one type. */
    singleType: boolean;
  };
  dualTypeMatch: PokemonDistractors;
  legendaryMythicalSelection: NoControls;
  pokemonByGeneration: NoControls;
  evolutionChain: PokemonDistractors & {
    /** Search uses the current eligible Pokémon pool. */
    response: SearchResponse<'pool'>;
  };
  evolutionGainedType: {
    /** Score types by their closest Pokémon to rank wrong answers. */
    similarityWeights: SimilarityWeights;
  };
  pokemonAbilities: {
    /** Prefer wrong abilities found on Pokémon sharing a target type. */
    plausibleProperties: boolean;
  };
  levelUpMoves: {
    /** Prefer wrong moves learned by Pokémon sharing a target type. */
    plausibleProperties: boolean;
  };
  statExtremes: {
    /** Inclusive allowed stat-point gap to each wrong Pokémon; null disables it. */
    statGap: readonly [number, number] | null;
  };
  typeMatchup: {
    /** Restrict targets to Pokémon with exactly one type. */
    singleType: boolean;
    /** Attack multipliers eligible to be asked about. */
    multipliers: readonly number[];
    /** Search for every attack type with the requested multiplier. */
    response: TypeSearchResponse<'effectiveness'>;
  };
  superEffectiveAttacker: PokemonDistractors & {
    /** Restrict targets to Pokémon with exactly one type. */
    singleType: boolean;
    /** Attack multipliers eligible to be asked about. */
    multipliers: readonly number[];
  };
  champion: PokemonDistractors & {
    /** Optional finale response and assistance rules; null uses ordinary choices. */
    finale: null | {
      /** Initially reveal choices, choices with types, or search. */
      opening: 'choices-types' | 'choices' | 'search';
      /** Allow player-requested clues. */
      assistance: boolean;
      /** Initial clue count used as the score penalty. */
      penalty: number;
    };
  };
}

type FamilyAnswerKinds = {
  itemIdentification: 'item';
  itemUses: 'text';
  weightComparison: 'pokemon';
  heightComparison: 'pokemon';
  moveTypes: 'type';
  locationRegion: 'text';
  moveCategory: 'text';
  pokedexCategories: 'pokemon';
  evolutionConditions: 'text';
  abilityEffects: 'text';
  heldItemEffects: 'text';
  hiddenAbilities: 'text';
  natureEffects: 'text';
  evYields: 'text';
  encounterLocations: 'pokemon';
  berryFlavors: 'text';
  naturalGift: 'type';
  pokemonFromHistoricalSprite: 'pokemon';
  spriteForPokemon: 'pokemon';
  silhouetteForPokemon: 'pokemon';
  pokemonFromSilhouette: 'pokemon';
  pokemonFromPixelCrop: 'pokemon';
  shinyPokemonIdentification: 'pokemon';
  pokedexEntryMatch: 'pokemon';
  pokemonTypes: 'type';
  typeOddOneOut: 'pokemon';
  pokemonByType: 'pokemon';
  dualTypeMatch: 'pokemon';
  legendaryMythicalSelection: 'pokemon';
  pokemonByGeneration: 'pokemon';
  evolutionChain: 'pokemon';
  evolutionGainedType: 'type';
  pokemonAbilities: 'text';
  levelUpMoves: 'text';
  statExtremes: 'pokemon';
  typeMatchup: 'type';
  superEffectiveAttacker: 'pokemon';
  champion: 'pokemon';
};

type ChoiceSelectionFor<Type extends keyof FamilyControls> = Type extends
  'evolutionConditions' | 'champion'
  ? 'single' | 'adaptive'
  : Type extends 'encounterLocations' | 'berryFlavors'
    ? 'single' | 'multi'
    : Type extends
          'pokemonByType' | 'legendaryMythicalSelection' | 'pokemonByGeneration'
      ? 'multi'
      : 'single';

type FamilyResponse<
  Type extends keyof FamilyControls,
  Strategy,
> = Strategy extends ChoiceResponse
  ? Strategy & { selection: ChoiceSelectionFor<Type> }
  : Strategy;

/**
 * Fully resolved builder input. Each family owns its controls and supported
 * response modes; its answer presentation kind is fixed by the family.
 */
export type FamilyRules = {
  [Type in keyof FamilyControls]: Omit<FamilyControls[Type], 'response'> & {
    /** Answer mode allowed for this family. */
    response: FamilyControls[Type] extends { response: infer Strategy }
      ? FamilyResponse<Type, Strategy>
      : FamilyResponse<Type, ChoiceResponse>;
    /** Fully merged visibility policy passed to the renderer. */
    rendering: QuestionRendering;
    /** Answer and subject layout, with the family's answer kind enforced. */
    view: Omit<QuestionView, 'answer'> & {
      /** Presentation kind allowed by this family. */
      answer: Extract<
        QuestionView['answer'],
        { kind: FamilyAnswerKinds[Type] }
      >;
    };
  };
};
