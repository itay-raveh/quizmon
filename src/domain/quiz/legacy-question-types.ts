import type { QuestionData, QuestionType } from './types';

// Saved rounds without difficulty and rules versions before 3 used this roster.
export const legacyQuestionTypes: readonly QuestionType[] = [
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

export const supportsLegacyQuestion = (
  type: QuestionData['questionType'],
): boolean => type === 'champion' || legacyQuestionTypes.includes(type);

export const legacyLeagueQuestionTypes = legacyQuestionTypes.filter(
  (type) => !['ability-check', 'move-check', 'stat-showdown'].includes(type),
);
