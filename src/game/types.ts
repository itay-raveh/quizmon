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

export const knowledgeCategories = [
  'identity',
  'description',
  'type',
  'evolution',
  'ability',
  'move',
  'stat',
  'matchup',
] as const;

export type KnowledgeCategory = (typeof knowledgeCategories)[number];
export type QuestionCategory = KnowledgeCategory | 'champion';

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
  description: string;
  evolvesFrom: string | null;
  evolvesTo: string[];
  generation: Generation;
  genus: string;
  id: number;
  levelMoves: string[];
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
  knowledgeCategories: KnowledgeCategory[];
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

export interface PokemonSequenceVisual extends PokemonOptionVisual {
  name: string;
}

export type QuestionInteraction = 'single-choice' | 'multi-select' | 'ordering';

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
  explanation?: string;
  id: string;
  media: QuestionMedia;
  options: string[];
  optionVisuals?: Record<string, PokemonOptionVisual>;
  pokemonName: string;
  prompt: QuestionPrompt;
  sequenceVisuals?: PokemonSequenceVisual[];
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
}
