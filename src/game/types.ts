import type { questionLabels } from './question-labels';

export const generations = [
  'I',
  'II',
  'III',
  'IV',
  'V',
  'VI',
  'VII',
  'VIII',
  'IX',
] as const;

export type Generation = (typeof generations)[number];

export const trainingModes = ['league', 'custom'] as const;
export const answerFlows = ['manual', 'auto', 'instant'] as const;
export const timerDisplays = ['hidden', 'seconds', 'milliseconds'] as const;

export type TrainingMode = (typeof trainingModes)[number];
export type AnswerFlow = (typeof answerFlows)[number];
export type TimerDisplay = (typeof timerDisplays)[number];

export const answerFlowDelays: Record<Exclude<AnswerFlow, 'manual'>, number> = {
  auto: 2_000,
  instant: 300,
};

export type QuestionType = Exclude<keyof typeof questionLabels, 'champion'>;

export const questionCategories = [
  'ability',
  'champion',
  'description',
  'evolution',
  'identity',
  'matchup',
  'move',
  'stat',
  'type',
] as const;

export type QuestionCategory = (typeof questionCategories)[number];

export const statNames = [
  'hp',
  'attack',
  'defense',
  'special-attack',
  'special-defense',
  'speed',
] as const;

export type StatName = (typeof statNames)[number];

interface PokemonIdentitySpriteGeneration {
  back: string[];
  front: string[];
  generation: Generation;
}

export interface PokemonIdentitySprites {
  generations: PokemonIdentitySpriteGeneration[];
}

export interface SpriteMeasurements {
  area: number;
  width: number;
  height: number;
  centerX: number;
  bottom: number;
  pixelPeekFocus?: string;
}

export type PixelPeekFocus = [x: number, y: number];

export type PackedSpriteMeasurements = [
  area: number,
  width: number,
  height: number,
  centerX: number,
  bottom: number,
];

export interface PokemonKnowledge {
  abilities: string[];
  color: string;
  description: string;
  displayName: string;
  hasDistinctDescription: boolean;
  evolutionFamily: number;
  evolvesFrom: string | null;
  evolvesTo: string[];
  generation: Generation;
  speciesGeneration: Generation;
  speciesId: number;
  speciesName: string;
  pokemonId: number;
  genus: string;
  formId: number;
  identitySprites: PokemonIdentitySprites;
  isLegendary: boolean;
  isMythical: boolean;
  levelMoves: string[];
  shape: string;
  shinySprite: string | null;
  sprite: string | null;
  spriteMeasurements: PackedSpriteMeasurements | null;
  pixelPeekFocus?: string;
  stats: Record<StatName, number>;
  types: string[];
}

interface TypeRelations {
  doubleTo: string[];
  halfTo: string[];
  noneTo: string[];
}

export interface PokemonCatalog {
  contentVersion: number;
  pokemon: Record<string, PokemonKnowledge>;
  typeRelations: Record<string, TypeRelations>;
}

export interface ExperienceSettings {
  answerFlow: AnswerFlow;
  reduceMotion: boolean;
  soundVolume: number;
  timerDisplay: TimerDisplay;
}

export interface Modifiers extends ExperienceSettings {
  generations: Generation[];
  questionTypes: QuestionType[];
  trainingMode: TrainingMode;
}

type QuestionMedia =
  | {
      kind: 'sprite';
      revealAt?: number;
      silhouette: boolean;
      src: string;
    }
  | {
      focusX: number;
      focusY: number;
      kind: 'pixel-peek';
      src: string;
      zoom?: number;
    }
  | { kind: 'pixel-sprite'; src: string }
  | { kind: 'none' };

export interface PokemonOptionVisual {
  dexNumber: number;
  silhouette?: boolean;
  src: string;
  types: string[];
}

export interface PokemonSearchOption {
  dexNumber: number;
  name: string;
}

type QuestionVisual =
  | {
      kind: 'evolution-link';
      before: string;
      after: string;
      stages: Record<string, PokemonOptionVisual>;
    }
  | { kind: 'generation-roundup'; generation: Generation }
  | { kind: 'type-check' }
  | { kind: 'type-twins' }
  | { kind: 'type-roundup'; type: string }
  | {
      evolution: PokemonOptionVisual & { name: string };
      gainedType: string;
      kind: 'evolution-shift';
    }
  | {
      direction: 'highest' | 'lowest';
      kind: 'stat-showdown';
      stat: StatName;
    }
  | { kind: 'type-matchup'; multiplier: number }
  | { kind: 'counter-pick'; multiplier: number };

type QuestionInteraction = 'single-choice' | 'multi-select';

interface QuestionAnswer {
  correctOptions: string[];
  interaction: QuestionInteraction;
}

export type QuestionPrompt =
  | { kind: 'text'; text: string }
  | {
      after: string;
      before: string;
      dexNumber: number;
      kind: 'pokemon';
      name: string;
    };

export interface QuestionRepetition {
  // Stable within a question type, independent of presentation order.
  identity: string;
  // Rotation subjects can differ from the Pokémon shown.
  subjects: string[];
  primary: string[];
  distractors: string[];
}

export interface QuestionData {
  repetition: QuestionRepetition;
  answer: QuestionAnswer;
  category: QuestionCategory;
  clues?: (
    string | { kind: 'generation'; generation: Generation; types: string[] }
  )[];
  concealOptionLabels?: boolean;
  generation: Generation;
  id: string;
  media: QuestionMedia;
  options: string[];
  optionDexNumbers?: Record<string, number>;
  optionClassifications?: Record<string, 'Legendary' | 'Mythical' | 'Neither'>;
  optionGenerations?: Record<string, Generation>;
  optionStats?: Record<string, number>;
  optionVisuals?: Record<string, PokemonOptionVisual>;
  pokemonName: string;
  pokemonTypes: string[];
  prompt: QuestionPrompt;
  questionType: keyof typeof questionLabels;
  searchOptions?: PokemonSearchOption[];
  visual?: QuestionVisual;
}

export type GameMode =
  { kind: 'training' } | { kind: 'daily'; date: string } | { kind: 'league' };

export const legacyQuestionCategories = ['cry', 'scale'] as const;
export const legacyQuestionTypes = [
  'battle-view',
  'evolution-trail',
  'evolution-order',
] as const;

export interface SavedAnswerResult {
  category: QuestionCategory | (typeof legacyQuestionCategories)[number];
  cluesUsed?: number;
  correct: boolean;
  generation?: Generation;
  pokemonName?: string;
  points: number;
  questionType?:
    QuestionData['questionType'] | (typeof legacyQuestionTypes)[number];
  responseMilliseconds?: number;
  speedBonus?: number;
}

export interface AnswerResult extends SavedAnswerResult {
  category: QuestionCategory;
  cluesUsed: number;
  generation: Generation;
  pokemonName: string;
  questionType: QuestionData['questionType'];
}

export interface GameResult {
  answers: SavedAnswerResult[];
  contentVersion: number;
  correctCount: number;
  elapsedMilliseconds?: number;
  elapsedSeconds: number;
  questionCount: number;
  score: number;
  scoreVersion?: number;
}
