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

export type QuestionType =
  | 'ability-check'
  | 'battle-view'
  | 'counter-pick'
  | 'evolution-shift'
  | 'field-notes'
  | 'move-check'
  | 'odd-one-out'
  | 'pixel-peek'
  | 'pokedex-scan'
  | 'shiny-spotter'
  | 'silhouette-match'
  | 'stat-showdown'
  | 'type-check'
  | 'type-matchup'
  | 'type-roundup';
export type QuestionCategory =
  | 'ability'
  | 'champion'
  | 'description'
  | 'evolution'
  | 'identity'
  | 'matchup'
  | 'move'
  | 'stat'
  | 'type';

export const statNames = [
  'hp',
  'attack',
  'defense',
  'special-attack',
  'special-defense',
  'speed',
] as const;

export type StatName = (typeof statNames)[number];

export interface PokemonKnowledge {
  abilities: string[];
  backSprite: string | null;
  color: string;
  description: string;
  evolvesFrom: string | null;
  evolvesTo: string[];
  generation: Generation;
  genus: string;
  id: number;
  levelMoves: string[];
  shape: string;
  shinySprite: string | null;
  sprite: string | null;
  stats: Record<StatName, number>;
  types: string[];
}

export interface TypeRelations {
  doubleTo: string[];
  halfTo: string[];
  noneTo: string[];
}

export interface PokemonCatalog {
  contentVersion: number;
  pokemon: Record<string, PokemonKnowledge>;
  typeRelations: Record<string, TypeRelations>;
}

export interface Modifiers {
  generations: Generation[];
  questionTypes: QuestionType[];
  soundEnabled: boolean;
  isLimitActive: boolean;
  limit: number;
  speedrunMode: boolean;
}

export type QuestionMedia =
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
    }
  | { kind: 'pixel-sprite'; src: string }
  | { kind: 'none' };

export interface PokemonOptionVisual {
  dexNumber: number;
  silhouette?: boolean;
  src: string;
}

export type QuestionInteraction = 'single-choice' | 'multi-select';

export interface QuestionAnswer {
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

export interface QuestionData {
  answer: QuestionAnswer;
  category: QuestionCategory;
  clues?: string[];
  concealOptionLabels?: boolean;
  id: string;
  media: QuestionMedia;
  options: string[];
  optionVisuals?: Record<string, PokemonOptionVisual>;
  pokemonName: string;
  prompt: QuestionPrompt;
  searchOptions?: string[];
  title?: string;
}

export type GameMode = { kind: 'training' } | { kind: 'daily'; date: string };

export interface AnswerResult {
  category: QuestionCategory;
  correct: boolean;
  points: number;
  responseMilliseconds?: number;
  speedBonus?: number;
}

export interface GameResult {
  answers: AnswerResult[];
  contentVersion: number;
  correctCount: number;
  elapsedSeconds: number;
  questionCount: number;
  score: number;
  scoreVersion: number;
}
