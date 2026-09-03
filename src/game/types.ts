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

export const questionTypeDefinitions = {
  'pokedex-scan': { category: 'identity', label: 'Pokédex scan' },
  'silhouette-match': { category: 'identity', label: 'Silhouette match' },
  'pixel-peek': { category: 'identity', label: 'Pixel peek' },
  'shiny-spotter': { category: 'identity', label: 'Shiny spotter' },
  'battle-view': { category: 'identity', label: 'Battle view' },
  'field-notes': { category: 'description', label: 'Field notes' },
  'type-check': { category: 'type', label: 'Type check' },
  'odd-one-out': { category: 'type', label: 'Odd one out' },
  'type-roundup': { category: 'type', label: 'Type roundup' },
  'evolution-shift': { category: 'evolution', label: 'Evolution shift' },
  'ability-check': { category: 'ability', label: 'Ability check' },
  'move-check': { category: 'move', label: 'Move check' },
  'stat-showdown': { category: 'stat', label: 'Stat showdown' },
  'type-matchup': { category: 'matchup', label: 'Type matchup' },
  'counter-pick': { category: 'matchup', label: 'Counter pick' },
} as const;

export type QuestionType = keyof typeof questionTypeDefinitions;
export const questionTypes = Object.keys(
  questionTypeDefinitions,
) as QuestionType[];
export type QuestionCategory =
  (typeof questionTypeDefinitions)[QuestionType]['category'] | 'champion';

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
