import type { QuestionData, SavedAnswerResult } from './types.ts';

export const questionLabels = {
  'item-identification': 'Item identification',
  'medicine-cabinet': 'Medicine cabinet',
  'evolution-items': 'Evolution items',
  'weight-comparison': 'Weight comparison',
  'height-comparison': 'Height comparison',
  'move-types': 'Move types',
  'name-that-region': 'Name that region',
  'move-purpose': 'Move purpose',
  'pokedex-categories': 'Pokédex categories',
  'evolution-conditions': 'Evolution conditions',
  'ability-effects': 'Ability effects',
  'held-item-effects': 'Held-item effects',
  'hidden-abilities': 'Hidden abilities',
  'nature-effects': 'Nature effects',
  'ev-yields': 'EV yields',
  'encounter-locations': 'Encounter locations',
  'berry-flavors': 'Berry flavors',
  'natural-gift': 'Natural Gift',

  'pokedex-scan': 'Pokédex scan',
  'sprite-match': 'Sprite match',
  'silhouette-match': 'Silhouette match',
  'whos-that-pokemon': 'Who’s that Pokémon?',
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
  knowledge: 'General knowledge',
  ability: questionLabels['ability-check'],
  champion: questionLabels.champion,
  description: questionLabels['field-notes'],
  evolution: questionLabels['evolution-shift'],
  identity: questionLabels['pokedex-scan'],
  matchup: questionLabels['type-matchup'],
  move: questionLabels['move-check'],
  stat: questionLabels['stat-showdown'],
  type: questionLabels['type-check'],
};

export const getCategoryLabel = (
  category: SavedAnswerResult['category'],
): string => categoryLabels[category];

export const getQuestionTitle = (
  question: Pick<QuestionData, 'questionType'>,
): string => questionLabels[question.questionType];
