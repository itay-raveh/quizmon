import type { QuestionRendering } from './rendering.ts';
import type { QuestionView } from './presentation.ts';
import type { Generation, StatName } from '../pokemon/types.ts';
import type { Level } from './level.ts';
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
      src: string;
    }
  | {
      focusX: number;
      focusY: number;
      kind: 'pokemonFromPixelCrop';
      src: string;
      zoom?: number;
    }
  | { kind: 'pixel-sprite'; src: string }
  | { kind: 'none' };

export interface PokemonOptionVisual {
  dexNumber: number;
  src: string | null;
  types: string[];
}

export interface PokemonSearchOption {
  sprite?: string | null;
  dexNumber?: number;
  types?: string[];
  name: string;
  label?: string;
}

type QuestionVisual =
  | {
      kind: 'evolutionChain' | 'evolution-endpoints';
      before: string;
      after: string;
      stages: Record<string, PokemonOptionVisual>;
    }
  | { kind: 'pokemonByGeneration'; generation: Generation }
  | { kind: 'pokemonTypes' }
  | { kind: 'dualTypeMatch' }
  | { kind: 'pokemonByType'; type: string }
  | {
      evolution: PokemonOptionVisual & { name: string };
      gainedType: string;
      kind: 'evolutionGainedType';
    }
  | {
      direction: 'highest' | 'lowest';
      kind: 'statExtremes';
      stat: StatName;
    }
  | {
      kind: 'measurement-comparison';
      measurement: 'height' | 'weight';
      direction: 'highest' | 'lowest';
    }
  | { kind: 'typeMatchup'; multiplier: number }
  | { kind: 'superEffectiveAttacker'; multiplier: number };

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
    }
  | {
      /** Text before the item rendered with the question's subject policy. */
      before: string;
      /** Text after the item rendered with the question's subject policy. */
      after: string;
      kind: 'item';
      /** Display name, independent of the item's catalog key. */
      name: string;
      /** Sprite selected by question generation. */
      sprite?: string;
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
  /** Level of the selected rule, which can be below the requested level. */
  variantLevel?: Level;
  /** Resolved visibility snapshot saved when this question was generated. */
  rendering?: QuestionRendering;
  /** Resolved answer and subject presentation saved with this question. */
  view?: QuestionView;
  namesOnly?: boolean;
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
  /** Current family ID, with `champion` reserved for the League finale. */
  questionType: QuestionType | 'champion';
  searchOptions?: PokemonSearchOption[];
  visual?: QuestionVisual;
}

export type GameMode =
  { kind: 'training' } | { kind: 'daily'; date: string } | { kind: 'league' };

import type { AnswerObservation } from './answer-observation.ts';

export interface SavedAnswerResult {
  observation?: AnswerObservation;
  category: QuestionCategory;
  unassistedSearch?: boolean;
  cluesUsed?: number;
  correct: boolean;
  subject?: AnswerSubject;
  points: number;
  questionType?: QuestionData['questionType'];
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
  rules?: RoundRules;
  answers: SavedAnswerResult[];
  correctCount: number;
  elapsedMilliseconds?: number;
  elapsedSeconds: number;
  questionCount: number;
  score: number;
}

import type { RoundRules } from './round-rules.ts';
