import type { QuestionData, SavedAnswerResult } from './types';

export const questionLabels = {
  'pokedex-scan': 'Pokédex scan',
  'silhouette-match': 'Silhouette match',
  'pixel-peek': 'Pixel peek',
  'shiny-spotter': 'Shiny spotter',
  'field-notes': 'Field notes',
  'type-check': 'Type check',
  'odd-one-out': 'Odd one out',
  'type-roundup': 'Type roundup',
  'type-twins': 'Type twins',
  'legend-hunt': 'Legend hunt',
  'generation-roundup': 'Generation roundup',
  'evolution-link': 'Evolution link',
  'evolution-shift': 'Evolution shift',
  'ability-check': 'Ability check',
  'move-check': 'Move check',
  'stat-showdown': 'Stat showdown',
  'type-matchup': 'Type matchup',
  'counter-pick': 'Counter pick',
  champion: 'Champion question',
} as const;

const categoryLabels: Record<SavedAnswerResult['category'], string> = {
  ability: questionLabels['ability-check'],
  champion: questionLabels.champion,
  cry: 'Pokémon cry',
  description: questionLabels['field-notes'],
  evolution: questionLabels['evolution-shift'],
  identity: questionLabels['pokedex-scan'],
  matchup: questionLabels['type-matchup'],
  move: questionLabels['move-check'],
  scale: 'Scale comparison',
  stat: questionLabels['stat-showdown'],
  type: questionLabels['type-check'],
};

export const getCategoryLabel = (
  category: SavedAnswerResult['category'],
): string => categoryLabels[category];

export const getQuestionTitle = (
  question: Pick<QuestionData, 'questionType'>,
): string => questionLabels[question.questionType];
