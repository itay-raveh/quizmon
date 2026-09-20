import type { QuestionData, QuestionType } from './types.ts';

export const standardQuestionTypes: readonly QuestionType[] = [
  'pokedex-scan',
  'silhouette-match',
  'sprite-match',
  'whos-that-pokemon',
  'pixel-peek',
  'shiny-spotter',
  'field-notes',
  'type-check',
  'odd-one-out',
  'type-roundup',
  'type-twins',
  'legend-hunt',
  'generation-roundup',
  'evolution-link',
  'evolution-shift',
  'ability-check',
  'move-check',
  'stat-showdown',
  'type-matchup',
  'counter-pick',
];

export const supportsStandardQuestion = (
  type: QuestionData['questionType'],
): boolean => type === 'champion' || standardQuestionTypes.includes(type);

export const standardLeagueQuestionTypes = standardQuestionTypes.filter(
  (type) => !['ability-check', 'move-check', 'stat-showdown'].includes(type),
);
