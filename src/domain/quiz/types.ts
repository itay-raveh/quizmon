import type { QuestionRendering } from './question-rendering.ts';
import type { QuestionView } from './question-presentation.ts';
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
      kind: 'pokemon-from-pixel-crop';
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
  dexNumber?: number;
  name: string;
  label?: string;
}

type QuestionVisual =
  | {
      kind: 'evolution-chain' | 'evolution-endpoints';
      before: string;
      after: string;
      stages: Record<string, PokemonOptionVisual>;
    }
  | { kind: 'pokemon-by-generation'; generation: Generation }
  | { kind: 'pokemon-types' }
  | { kind: 'dual-type-match' }
  | { kind: 'pokemon-by-type'; type: string }
  | {
      evolution: PokemonOptionVisual & { name: string };
      gainedType: string;
      kind: 'evolution-gained-type';
    }
  | {
      direction: 'highest' | 'lowest';
      kind: 'stat-extremes';
      stat: StatName;
    }
  | {
      kind: 'measurement-comparison';
      measurement: 'height' | 'weight';
      direction: 'highest' | 'lowest';
    }
  | { kind: 'type-matchup'; multiplier: number }
  | { kind: 'super-effective-attacker'; multiplier: number };

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

interface ChoiceDetail {
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
  rendering?: QuestionRendering;
  view?: QuestionView;
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
  questionType?: string;
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
  correctCount: number;
  elapsedMilliseconds?: number;
  elapsedSeconds: number;
  questionCount: number;
  score: number;
}

export type { ScoreMultipliers } from './score-multipliers.ts';
import type { ScoreMultipliers } from './score-multipliers.ts';
import type { RoundRules } from './round-rules.ts';
