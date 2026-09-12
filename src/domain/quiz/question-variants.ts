import {
  resolveDifficultyVariant,
  type Difficulty,
  type DifficultyVariants,
} from './difficulty';
import type { QuestionData } from './types';

// Bump when changing any executable variant rule. Saved lineups retain their rules.
export const QUESTION_RULES_VERSION = 1;

export interface VariantRules {
  distractors?: 'dissimilar' | 'similar';
  search?: boolean;
  namesOnly?: boolean;
  singleType?: boolean;
  showTypes?: boolean;
  typeGrid?: boolean;
  currentSprite?: boolean;
  cropScale?: number;
  shinyReference?: boolean;
  plausibleProperties?: boolean;
  statGap?: readonly [number, number];
  multipliers?: readonly number[];
  finale?: {
    opening: 'choices-types' | 'choices' | 'search-genus' | 'search';
    assistance: boolean;
    penalty: number;
  };
}

const questionVariants: Record<
  QuestionData['questionType'],
  DifficultyVariants<VariantRules>
> = {
  'pokedex-scan': {
    1: { currentSprite: true, distractors: 'dissimilar' },
    2: { currentSprite: true, distractors: 'similar' },
    4: { distractors: 'similar' },
    5: { search: true },
  },
  'sprite-match': {
    1: { distractors: 'dissimilar' },
    3: { distractors: 'similar' },
  },
  'silhouette-match': {
    2: { distractors: 'dissimilar' },
    4: { distractors: 'similar' },
  },
  'whos-that-pokemon': {
    2: { distractors: 'dissimilar' },
    3: { distractors: 'similar' },
    5: { search: true },
  },
  'pixel-peek': { 3: { cropScale: 0.65 }, 4: {}, 5: { search: true } },
  'shiny-spotter': { 3: { shinyReference: true }, 4: {} },
  'field-notes': { 2: {}, 3: { namesOnly: true }, 4: { search: true } },
  'type-check': {
    1: { singleType: true },
    2: {},
    3: { typeGrid: true },
    4: { typeGrid: true, namesOnly: true },
  },
  'odd-one-out': { 2: { singleType: true }, 3: {} },
  'type-roundup': { 2: { singleType: true }, 3: {} },
  'type-twins': { 3: {}, 4: { namesOnly: true } },
  'legend-hunt': { 2: {}, 4: { namesOnly: true } },
  'generation-roundup': { 2: {}, 4: { namesOnly: true } },
  'evolution-link': { 2: {}, 4: { search: true } },
  'evolution-shift': { 3: {}, 4: { namesOnly: true } },
  'ability-check': { 3: {}, 5: { plausibleProperties: true } },
  'move-check': { 4: {}, 5: { plausibleProperties: true } },
  'stat-showdown': {
    3: { statGap: [40, Infinity] },
    4: { statGap: [20, Infinity] },
    5: { statGap: [1, 15] },
  },
  'type-matchup': {
    1: { singleType: true, showTypes: true, multipliers: [2] },
    2: { singleType: true, multipliers: [2] },
    3: { showTypes: true, multipliers: [2, 4] },
    4: { multipliers: [0.25, 0.5, 2, 4] },
    5: { typeGrid: true, multipliers: [0.25, 0.5, 2, 4] },
  },
  'counter-pick': {
    2: { singleType: true, showTypes: true, multipliers: [2] },
    3: { showTypes: true, multipliers: [2, 4] },
    4: { multipliers: [0.25, 0.5, 2, 4] },
  },
  champion: {
    1: { finale: { opening: 'choices-types', assistance: false, penalty: 2 } },
    2: { finale: { opening: 'choices', assistance: false, penalty: 1 } },
    3: { finale: { opening: 'search-genus', assistance: true, penalty: 2 } },
    4: { finale: { opening: 'search', assistance: true, penalty: 0 } },
    5: { finale: { opening: 'search', assistance: false, penalty: 0 } },
  },
};

export const getQuestionVariant = (
  type: QuestionData['questionType'],
  difficulty: Difficulty,
) => resolveDifficultyVariant(questionVariants[type], difficulty);
