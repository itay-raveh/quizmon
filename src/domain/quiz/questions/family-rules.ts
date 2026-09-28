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
  sharedType: number;
  shape: number;
  color: number;
  generation: number;
  evolutionStage: number;
  statMaximum: number;
  statScale: number;
};

export interface PokemonDistractors {
  smallPoolPolicy: 'semantic-band' | 'fixed-size';
  distractorRankDirection: 'most-similar' | 'least-similar';
  distractorPoolSize: number;
  smallPoolSimilarityRatio: number;
  distantSpeciesFraction: number;
  similarityWeights: SimilarityWeights;
}

interface EffectDistractors {
  minimumEffectSimilarity: number;
  maximumEffectSimilarity: number;
  preferSimilarEffects: boolean;
  useFullEffectText: boolean;
}

export type EffectRules = EffectDistractors & {
  allowMissingSprites: boolean;
  sameItemCategory?: boolean;
  response: ChoiceResponse | { kind: 'search'; candidates: 'provided' };
};

type NoControls = object;

interface FamilyControls {
  'item-identification': {
    distinctItemCategories: boolean;
    sameItemPocket: boolean;
    sameItemCategory: boolean;
    machineDiscChance: number;
    response: SearchResponse<'provided'>;
  };
  'item-uses': EffectDistractors & {
    sameItemCategory: boolean;
    allowMissingSprites: boolean;
  };
  'weight-comparison': { measurement: MeasurementRules };
  'height-comparison': { measurement: MeasurementRules };
  'move-types': {
    showMoveDescription: boolean;
    allOptions: boolean;
    excludeTypeHintNames: boolean;
  };
  'location-region': { allOptions: boolean };
  'move-category': { statusMovesOnly: boolean; sameMoveType: boolean };
  'pokedex-categories': {
    sameColorOrShape: boolean;
    closeAlternatives: boolean;
    similarityWeights: SimilarityWeights;
  };
  'evolution-conditions': {
    minimumEvolutionConditions: number;
    multiSelectEvolutionConditions: boolean;
    exactEvolutionValues: boolean;
    mixedLevelEvolutionConditions: boolean;
    compactEvolutionLabels: boolean;
    exactLevelQuestionChance: number;
    directEvolutionItems: boolean;
    evolutionLocations: boolean;
    preferCloseConditionValues: boolean;
    allowMissingSprites: boolean;
  };
  'ability-effects': EffectDistractors & {
    allowMissingSprites: boolean;
    response: SearchResponse<'provided'>;
  };
  'held-item-effects': EffectDistractors & {
    sameItemCategory: boolean;
    allowMissingSprites: boolean;
  };
  'hidden-abilities': {
    sameTypeAbilityDistractors: boolean;
    allowMissingSprites: boolean;
  };
  'nature-effects': { shareNatureStat: boolean };
  'ev-yields': { completeEvYield: boolean; closeAlternatives: boolean };
  'encounter-locations': {
    encounterConditions: boolean;
    closeAlternatives: boolean;
    multiSelectEncounters: boolean;
    similarityWeights: SimilarityWeights;
    sameEncounterMethodWeight: number;
  };
  'berry-flavors': { completeFlavors: boolean; allOptions: boolean };
  'natural-gift': { allOptions: boolean };
  'pokemon-from-historical-sprite': PokemonDistractors & {
    currentSpriteChance: number;
    backSpriteChance: number;
    frontSpriteChance: number;
    response: SearchResponse<'pool'>;
  };
  'sprite-for-pokemon': PokemonDistractors;
  'silhouette-for-pokemon': PokemonDistractors;
  'pokemon-from-silhouette': PokemonDistractors & {
    response: SearchResponse<'pool'>;
  };
  'pokemon-from-pixel-crop': PokemonDistractors & {
    response: SearchResponse<'pool'>;
    cropScale: number;
  };
  'shiny-pokemon-identification': PokemonDistractors;
  'pokedex-entry-match': PokemonDistractors & {
    response: SearchResponse<'pool'>;
  };
  'pokemon-types': {
    singleType: boolean;
    response: GridResponse<'subject-types'>;
    similarityWeights: SimilarityWeights;
  };
  'type-odd-one-out': { singleType: boolean };
  'pokemon-by-type': { singleType: boolean };
  'dual-type-match': PokemonDistractors;
  'legendary-mythical-selection': NoControls;
  'pokemon-by-generation': NoControls;
  'evolution-chain': PokemonDistractors & { response: SearchResponse<'pool'> };
  'evolution-gained-type': { similarityWeights: SimilarityWeights };
  'pokemon-abilities': { plausibleProperties: boolean };
  'level-up-moves': { plausibleProperties: boolean };
  'stat-extremes': { statGap: readonly [number, number] | null };
  'type-matchup': {
    singleType: boolean;
    showTypes: boolean;
    multipliers: readonly number[];
    response: GridResponse<'effectiveness'>;
  };
  'super-effective-attacker': PokemonDistractors & {
    singleType: boolean;
    showTypes: boolean;
    multipliers: readonly number[];
  };
  champion: PokemonDistractors & {
    finale: null | {
      opening: 'choices-types' | 'choices' | 'search';
      assistance: boolean;
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

export type FamilyRules = {
  [Type in keyof FamilyControls]: Omit<FamilyControls[Type], 'response'> & {
    response: FamilyControls[Type] extends { response: infer Strategy }
      ? Strategy
      : ChoiceResponse;
    rendering: QuestionRendering;
    view: Omit<QuestionView, 'answer'> & {
      answer: Extract<
        QuestionView['answer'],
        { kind: FamilyAnswerKinds[Type] }
      >;
    };
  };
};
