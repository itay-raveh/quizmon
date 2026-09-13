import type { QuestionRendering } from './question-rendering';
import type { FormGroup, Generation, StatName } from '../pokemon/types';
import type { Difficulty } from './difficulty';
import type { DailyTrack } from './daily-track';
import type { questionLabels } from './question-labels';
export type QuestionType = Exclude<keyof typeof questionLabels, 'champion'>;

export const questionCategories = [
  'ability',
  'champion',
  'description',
  'evolution',
  'identity',
  'matchup',
  'knowledge',
  'move',
  'stat',
  'type',
] as const;

export type QuestionCategory = (typeof questionCategories)[number];

type QuestionMedia =
  | {
      kind: 'sprite';
      revealAt?: number;
      silhouette?: boolean;
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
  sprite?: string | null;
  dexNumber: number;
  name: string;
}

type QuestionVisual =
  | {
      kind: 'evolution-link' | 'evolution-endpoints';
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

type QuestionInteraction = 'single-choice' | 'multi-select' | 'search';

interface QuestionAnswer {
  correctOptions: string[];
  interaction: QuestionInteraction;
}

export type QuestionPrompt =
  | { kind: 'text'; text: string; supportingText?: string }
  | {
      after: string;
      before: string;
      dexNumber: number;
      kind: 'pokemon';
      name: string;
      supportingText?: string;
    };

export interface QuestionRepetition {
  // Stable within a question type, independent of presentation order.
  identity: string;
  // Rotation subjects can differ from the Pokémon shown.
  subjects: string[];
  primary: string[];
  distractors: string[];
}

export const subjectKinds = [
  'pokemon',
  'item',
  'move',
  'ability',
  'location',
  'nature',
  'berry',
] as const;

export interface AnswerSubject {
  kind: (typeof subjectKinds)[number];
  name?: string;
  generation?: Generation;
}

export interface QuestionSubject extends AnswerSubject {
  name: string;
  generation: Generation;
  types?: string[];
}

export interface QuestionData {
  optionLabels?: Record<string, string>;
  optionImages?: Record<string, string>;
  optionReveals?: Record<string, string>;
  explanation?: string;
  context?: string;
  variantLevel?: Difficulty;
  rulesVersion?: number;
  rendering?: QuestionRendering;
  namesOnly?: boolean;
  showTypes?: boolean;
  initialClues?: number;
  assistanceAllowed?: boolean;
  suppliedClues?: string[];
  assistanceUsed?: number;
  repetition: QuestionRepetition;
  answer: QuestionAnswer;
  category: QuestionCategory;
  clues?: (
    string | { kind: 'generation'; generation: Generation; types: string[] }
  )[];
  concealOptionLabels?: boolean;
  subject: QuestionSubject;
  id: string;
  media: QuestionMedia;
  options: string[];
  optionDexNumbers?: Record<string, number>;
  optionClassifications?: Record<string, 'Legendary' | 'Mythical' | 'Neither'>;
  optionGenerations?: Record<string, Generation>;
  optionStats?: Record<string, number>;
  optionVisuals?: Record<string, PokemonOptionVisual>;
  prompt: QuestionPrompt;
  questionType: keyof typeof questionLabels;
  searchOptions?: PokemonSearchOption[];
  visual?: QuestionVisual;
}

export type GameMode =
  | { kind: 'training' }
  | { kind: 'daily'; date: string; track?: DailyTrack }
  | { kind: 'league' };

export const legacyQuestionCategories = ['cry', 'scale'] as const;
export const legacyQuestionTypes = [
  'battle-view',
  'evolution-trail',
  'evolution-order',
] as const;

export interface SavedAnswerResult {
  category: QuestionCategory | (typeof legacyQuestionCategories)[number];
  unassistedSearch?: boolean;
  cluesUsed?: number;
  correct: boolean;
  subject?: AnswerSubject;
  points: number;
  questionType?:
    QuestionData['questionType'] | (typeof legacyQuestionTypes)[number];
  responseMilliseconds?: number;
  speedBonus?: number;
}

export interface AnswerResult extends SavedAnswerResult {
  category: QuestionCategory;
  cluesUsed: number;
  subject: AnswerSubject;
  questionType: QuestionData['questionType'];
}

export interface GameResult {
  dailyTrack?: DailyTrack;
  rules?: RoundRules;
  answers: SavedAnswerResult[];
  contentVersion: number;
  correctCount: number;
  elapsedMilliseconds?: number;
  elapsedSeconds: number;
  questionCount: number;
  score: number;
  scoreVersion?: number;
}

export interface RoundRules {
  automaticQuestionTypes?: QuestionType[];
  version: number;
  difficulty: Difficulty;
  generations: Generation[];
  formGroups: FormGroup[];
  questionTypes: QuestionType[];
}
