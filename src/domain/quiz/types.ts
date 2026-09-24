import type { QuestionRendering } from './question-rendering.ts';
import type { Generation, StatName } from '../pokemon/types.ts';
import type { Difficulty } from './difficulty.ts';
import type { DailyTrack } from './daily-track.ts';
import type { QuestionType } from './questions/definitions.ts';
export type { QuestionType } from './questions/definitions.ts';

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
  | {
      kind: 'measurement-comparison';
      measurement: 'height' | 'weight';
      direction: 'highest' | 'lowest';
    }
  | { kind: 'type-matchup'; multiplier: number }
  | { kind: 'counter-pick'; multiplier: number };

type QuestionInteraction = 'single-choice' | 'multi-select' | 'search';

interface QuestionAnswer {
  correctOptions: string[];
  interaction: QuestionInteraction;
}

export type QuestionPrompt =
  | {
      kind: 'text';
      text: string;
      description?: string;
      supportingText?: string;
    }
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

interface AnswerSubject {
  kind: (typeof subjectKinds)[number];
  name?: string;
  generation?: Generation;
}

export interface QuestionSubject extends AnswerSubject {
  name: string;
  generation: Generation;
  types?: string[];
}

export interface ChoiceDetail {
  value: string;
  label: string;
}

export interface QuestionData {
  optionDetails?: Record<string, ChoiceDetail[]>;
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
  questionType: QuestionType | 'champion';
  searchOptions?: PokemonSearchOption[];
  visual?: QuestionVisual;
}

export type GameMode =
  | { kind: 'training' }
  | { kind: 'daily'; date: string; track?: DailyTrack }
  | { kind: 'league' };

export type { AnswerObservation } from './answer-observation.ts';
import type { AnswerObservation } from './answer-observation.ts';

export interface SavedAnswerResult {
  observation?: AnswerObservation;
  category: QuestionCategory;
  unassistedSearch?: boolean;
  cluesUsed?: number;
  correct: boolean;
  subject?: AnswerSubject;
  points: number;
  questionType?: QuestionType | 'champion';
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
  scoreMultipliers?: ScoreMultipliers;
  dailyTrack?: DailyTrack;
  puzzleId?: string;
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

export type { ScoreMultipliers } from './score-multipliers.ts';
import type { ScoreMultipliers } from './score-multipliers.ts';
import type { RoundRules } from './round-rules.ts';
