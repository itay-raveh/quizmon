import type { MeasurementRules } from '../measurement-comparison.ts';
import type { QuestionRendering } from '../question-rendering.ts';
import type { QuestionView } from '../question-presentation.ts';
import type { ResponseStrategy } from './response-strategies.ts';

type ChoiceResponse = Extract<ResponseStrategy, { kind: 'choices' }>;
type SearchResponse<Candidates extends 'pool' | 'provided'> =
  ChoiceResponse | { kind: 'search'; candidates: Candidates };
type GridResponse<Correct extends 'subject-types' | 'effectiveness'> =
  ChoiceResponse | { kind: 'type-grid'; correct: Correct };
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
  response: ChoiceResponse | { kind: 'search'; candidates: 'provided' };
};

type NoControls = object;

interface FamilyControls {
  'item-identification': {
    /** Require wrong items from different categories. */
    distinctItemCategories: boolean;
    /** Restrict wrong items to the target's bag pocket. */
    sameItemPocket: boolean;
    /** Restrict wrong items to the target's pocket and category. */
    sameItemCategory: boolean;
    /** Probability of trying a type-colored TM disc question first. */
    machineDiscChance: number;
    /** Search uses item names supplied by the builder. */
    response: SearchResponse<'provided'>;
  };
  'item-uses': EffectDistractors & {
    /** Restrict wrong effects to items in the target's category. */
    sameItemCategory: boolean;
    /** Permit targets without an item sprite. */
    allowMissingSprites: boolean;
  };
  'weight-comparison': {
    /** Ratio and spread limits for four Pokémon weights. */
    measurement: MeasurementRules;
  };
  'height-comparison': {
    /** Ratio and spread limits for four Pokémon heights. */
    measurement: MeasurementRules;
  };
  'move-types': {
    /** Include the move's description in the prompt. */
    showMoveDescription: boolean;
    /** Offer every type instead of four sampled types. */
    allOptions: boolean;
    /** Skip move names that contain their answer type. */
    excludeTypeHintNames: boolean;
  };
  'location-region': {
    /** Offer every eligible region instead of four sampled regions. */
    allOptions: boolean;
  };
  'move-category': {
    /** Ask only about status moves. */
    statusMovesOnly: boolean;
    /** Choose wrong moves with the same type as the target. */
    sameMoveType: boolean;
  };
  'pokedex-categories': {
    /** Require each wrong Pokémon to share the target's color or shape. */
    sameColorOrShape: boolean;
    /** Rank eligible wrong Pokémon by similarity before taking three. */
    closeAlternatives: boolean;
    /** Similarity coefficients for ranking wrong Pokémon. */
    similarityWeights: SimilarityWeights;
  };
  'evolution-conditions': {
    /** Minimum distinct true conditions required for a target. */
    minimumEvolutionConditions: number;
    /** Ask for multiple correct conditions when available. */
    multiSelectEvolutionConditions: boolean;
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
  'ability-effects': EffectDistractors & {
    /** Permit targets without a sprite. */
    allowMissingSprites: boolean;
    /** Search uses ability names supplied by the builder. */
    response: SearchResponse<'provided'>;
  };
  'held-item-effects': EffectDistractors & {
    /** Restrict wrong effects to items in the target's category. */
    sameItemCategory: boolean;
    /** Permit targets without an item sprite. */
    allowMissingSprites: boolean;
  };
  'hidden-abilities': {
    /** Source wrong abilities from Pokémon sharing a target type. */
    sameTypeAbilityDistractors: boolean;
    /** Permit targets without a Pokémon sprite. */
    allowMissingSprites: boolean;
  };
  'nature-effects': {
    /** Choose wrong natures that share a raised or lowered stat. */
    shareNatureStat: boolean;
  };
  'ev-yields': {
    /** Ask for the full EV yield instead of one boosted stat. */
    completeEvYield: boolean;
    /** Rank wrong full-yield answers by total EV distance. */
    closeAlternatives: boolean;
  };
  'encounter-locations': {
    /** Include time- and weather-dependent encounter records. */
    encounterConditions: boolean;
    /** Rank wrong Pokémon by encounter method and similarity. */
    closeAlternatives: boolean;
    /** Allow two or three correct Pokémon in a four-option question. */
    multiSelectEncounters: boolean;
    /** Similarity coefficients for wrong Pokémon. */
    similarityWeights: SimilarityWeights;
    /** Extra rank points for a wrong Pokémon using the same encounter method. */
    sameEncounterMethodWeight: number;
  };
  'berry-flavors': {
    /** Ask for every positive flavor rather than the single strongest flavor. */
    completeFlavors: boolean;
  };
  'natural-gift': NoControls;
  'pokemon-from-historical-sprite': PokemonDistractors & {
    /** Probability of showing the current sprite instead of a historical one. */
    currentSpriteChance: number;
    /** Probability of taking a back sprite before sampling a generation. */
    backSpriteChance: number;
    /** Chance of preferring a front sprite within a sampled generation. */
    frontSpriteChance: number;
    /** Search uses the current eligible Pokémon pool. */
    response: SearchResponse<'pool'>;
  };
  'sprite-for-pokemon': PokemonDistractors;
  'silhouette-for-pokemon': PokemonDistractors;
  'pokemon-from-silhouette': PokemonDistractors & {
    /** Search uses the current eligible Pokémon pool. */
    response: SearchResponse<'pool'>;
  };
  'pokemon-from-pixel-crop': PokemonDistractors & {
    /** Search uses the current eligible Pokémon pool. */
    response: SearchResponse<'pool'>;
    /** Multiplier applied to the generated pixel-crop zoom. */
    cropScale: number;
  };
  'shiny-pokemon-identification': PokemonDistractors;
  'pokedex-entry-match': PokemonDistractors & {
    /** Search uses the current eligible Pokémon pool. */
    response: SearchResponse<'pool'>;
  };
  'pokemon-types': {
    /** Restrict targets to Pokémon with exactly one type. */
    singleType: boolean;
    /** A type grid selects every type of the subject. */
    response: GridResponse<'subject-types'>;
    /** Score types by their closest Pokémon to rank wrong answers. */
    similarityWeights: SimilarityWeights;
  };
  'type-odd-one-out': {
    /** Restrict candidates to Pokémon with exactly one type. */
    singleType: boolean;
  };
  'pokemon-by-type': {
    /** Restrict candidates to Pokémon with exactly one type. */
    singleType: boolean;
  };
  'dual-type-match': PokemonDistractors;
  'legendary-mythical-selection': NoControls;
  'pokemon-by-generation': NoControls;
  'evolution-chain': PokemonDistractors & {
    /** Search uses the current eligible Pokémon pool. */
    response: SearchResponse<'pool'>;
  };
  'evolution-gained-type': {
    /** Score types by their closest Pokémon to rank wrong answers. */
    similarityWeights: SimilarityWeights;
  };
  'pokemon-abilities': {
    /** Prefer wrong abilities found on Pokémon sharing a target type. */
    plausibleProperties: boolean;
  };
  'level-up-moves': {
    /** Prefer wrong moves learned by Pokémon sharing a target type. */
    plausibleProperties: boolean;
  };
  'stat-extremes': {
    /** Inclusive allowed stat-point gap to each wrong Pokémon; null disables it. */
    statGap: readonly [number, number] | null;
  };
  'type-matchup': {
    /** Restrict targets to Pokémon with exactly one type. */
    singleType: boolean;
    /** Show the target's types before answering. */
    showTypes: boolean;
    /** Attack multipliers eligible to be asked about. */
    multipliers: readonly number[];
    /** A type grid selects every attack type with the requested multiplier. */
    response: GridResponse<'effectiveness'>;
  };
  'super-effective-attacker': PokemonDistractors & {
    /** Restrict targets to Pokémon with exactly one type. */
    singleType: boolean;
    /** Show the target's types before answering. */
    showTypes: boolean;
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
  'item-identification': 'text';
  'item-uses': 'text';
  'weight-comparison': 'pokemon';
  'height-comparison': 'pokemon';
  'move-types': 'type';
  'location-region': 'text';
  'move-category': 'text';
  'pokedex-categories': 'pokemon';
  'evolution-conditions': 'text';
  'ability-effects': 'text';
  'held-item-effects': 'text';
  'hidden-abilities': 'text';
  'nature-effects': 'text';
  'ev-yields': 'text';
  'encounter-locations': 'pokemon';
  'berry-flavors': 'text';
  'natural-gift': 'type';
  'pokemon-from-historical-sprite': 'pokemon';
  'sprite-for-pokemon': 'pokemon';
  'silhouette-for-pokemon': 'pokemon';
  'pokemon-from-silhouette': 'pokemon';
  'pokemon-from-pixel-crop': 'pokemon';
  'shiny-pokemon-identification': 'pokemon';
  'pokedex-entry-match': 'pokemon';
  'pokemon-types': 'type';
  'type-odd-one-out': 'pokemon';
  'pokemon-by-type': 'pokemon';
  'dual-type-match': 'pokemon';
  'legendary-mythical-selection': 'pokemon';
  'pokemon-by-generation': 'pokemon';
  'evolution-chain': 'pokemon';
  'evolution-gained-type': 'type';
  'pokemon-abilities': 'text';
  'level-up-moves': 'text';
  'stat-extremes': 'pokemon';
  'type-matchup': 'type';
  'super-effective-attacker': 'pokemon';
  champion: 'pokemon';
};

/**
 * Fully resolved builder input. Each family owns its controls and supported
 * response modes; its answer presentation kind is fixed by the family.
 */
export type FamilyRules = {
  [Type in keyof FamilyControls]: Omit<FamilyControls[Type], 'response'> & {
    /** Answer mode allowed for this family. */
    response: FamilyControls[Type] extends { response: infer Strategy }
      ? Strategy
      : ChoiceResponse;
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
