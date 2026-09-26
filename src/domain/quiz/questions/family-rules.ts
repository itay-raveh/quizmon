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
  'medicine-cabinet': EffectDistractors & {
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
  'name-that-region': { allOptions: boolean };
  'move-purpose': { statusMovesOnly: boolean; sameMoveType: boolean };
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
  'pokedex-scan': PokemonDistractors & {
    currentSpriteChance: number;
    backSpriteChance: number;
    frontSpriteChance: number;
    response: SearchResponse<'pool'>;
  };
  'sprite-match': PokemonDistractors;
  'silhouette-match': PokemonDistractors;
  'whos-that-pokemon': PokemonDistractors & {
    response: SearchResponse<'pool'>;
  };
  'pixel-peek': PokemonDistractors & {
    response: SearchResponse<'pool'>;
    cropScale: number;
  };
  'shiny-spotter': PokemonDistractors;
  'field-notes': PokemonDistractors & {
    response: SearchResponse<'pool'>;
  };
  'type-check': {
    singleType: boolean;
    response: GridResponse<'subject-types'>;
    similarityWeights: SimilarityWeights;
  };
  'odd-one-out': { singleType: boolean };
  'type-roundup': { singleType: boolean };
  'type-twins': PokemonDistractors;
  'legend-hunt': NoControls;
  'generation-roundup': NoControls;
  'evolution-link': PokemonDistractors & { response: SearchResponse<'pool'> };
  'evolution-shift': { similarityWeights: SimilarityWeights };
  'ability-check': { plausibleProperties: boolean };
  'move-check': { plausibleProperties: boolean };
  'stat-showdown': { statGap: readonly [number, number] | null };
  'type-matchup': {
    singleType: boolean;
    showTypes: boolean;
    multipliers: readonly number[];
    response: GridResponse<'effectiveness'>;
  };
  'counter-pick': PokemonDistractors & {
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

export type FamilyRules = {
  [Type in keyof FamilyControls]: Omit<FamilyControls[Type], 'response'> & {
    response: FamilyControls[Type] extends { response: infer Strategy }
      ? Strategy
      : ChoiceResponse;
    rendering: QuestionRendering;
    view: QuestionView;
  };
};
