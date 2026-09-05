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

export interface PokemonIdentitySprites {
  currentBack: string | null;
  historicalBack: string[];
  historicalFront: string[];
}

export interface PokemonKnowledge {
  abilities: string[];
  color: string;
  description: string;
  evolvesFrom: string | null;
  evolvesTo: string[];
  generation: Generation;
  genus: string;
  id: number;
  identitySprites: PokemonIdentitySprites;
  levelMoves: string[];
  shape: string;
  shinySprite: string | null;
  sprite: string | null;
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

export interface Modifiers {
  generations: Generation[];
  questionTypes: QuestionType[];
  soundEnabled: boolean;
  limit: number;
  speedrunMode: boolean;
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
    }
  | { kind: 'pixel-sprite'; src: string }
  | { kind: 'none' };

export interface PokemonOptionVisual {
  dexNumber: number;
  silhouette?: boolean;
  src: string;
  types: string[];
}

type QuestionVisual =
  | { kind: 'type-check' }
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

export interface QuestionData {
  answer: QuestionAnswer;
  category: QuestionCategory;
  clues?: string[];
  concealOptionLabels?: boolean;
  generation: Generation;
  id: string;
  media: QuestionMedia;
  options: string[];
  optionVisuals?: Record<string, PokemonOptionVisual>;
  pokemonName: string;
  pokemonTypes: string[];
  prompt: QuestionPrompt;
  questionType: QuestionType | 'champion';
  searchOptions?: string[];
  title?: string;
  visual?: QuestionVisual;
}

export type GameMode = { kind: 'training' } | { kind: 'daily'; date: string };

export interface AnswerResult {
  category: QuestionCategory;
  cluesUsed: number;
  correct: boolean;
  generation: Generation;
  pokemonName: string;
  points: number;
  questionType: QuestionType | 'champion';
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
