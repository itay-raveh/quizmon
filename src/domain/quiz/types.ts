import type { Generation, StatName } from '../pokemon/types';
import type { questionLabels } from './question-labels';
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
