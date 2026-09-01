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
  'scale',
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
  height: number;
  id: number;
  levelMoves: string[];
  sprite: string | null;
  stats: Record<StatName, number>;
  types: string[];
  weight: number;
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
  | { kind: 'pixel-sprite'; src: string }
  | { kind: 'none' };

export interface PokemonOptionVisual {
  dexNumber: number;
  src: string;
}

export interface QuestionData {
  category: QuestionCategory;
  correctOption: string;
  clues?: string[];
  id: string;
  media: QuestionMedia;
  options: string[];
  optionVisuals?: Record<string, PokemonOptionVisual>;
  pokemonName: string;
  prompt: string;
}

export type GameMode = { kind: 'training' } | { kind: 'daily'; date: string };

export interface AnswerResult {
  category: QuestionCategory;
  correct: boolean;
  points: number;
}

export interface GameResult {
  answers: AnswerResult[];
  contentVersion: number;
  correctCount: number;
  elapsedSeconds: number;
  questionCount: number;
  score: number;
}
