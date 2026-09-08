import { questionLabels } from '../question-labels';
import type {
  QuestionType,
  QuestionCategory,
  QuestionData,
  SavedAnswerResult,
} from '../types';

interface QuestionDefinition {
  description: string;
  group: QuestionTypeGroup;
  label: string;
}

export const questionTypeGroups = [
  {
    id: 'identity',
    label: 'Identity',
  },
  {
    id: 'knowledge',
    label: 'General knowledge',
  },
  {
    id: 'battle',
    label: 'Battle knowledge',
  },
] as const;

export type QuestionTypeGroup = (typeof questionTypeGroups)[number]['id'];

export const questionDefinitions = {
  'pokedex-scan': {
    description: 'Identify Pokémon across generations of game sprites.',
    group: 'identity',
    label: questionLabels['pokedex-scan'],
  },
  'silhouette-match': {
    description: 'Pick the silhouette of a named Pokémon.',
    group: 'identity',
    label: questionLabels['silhouette-match'],
  },
  'pixel-peek': {
    description: 'Name a Pokémon from a tiny sprite crop.',
    group: 'identity',
    label: questionLabels['pixel-peek'],
  },
  'shiny-spotter': {
    description: 'Find the Pokémon shown in shiny colors.',
    group: 'identity',
    label: questionLabels['shiny-spotter'],
  },
  'field-notes': {
    description: 'Match a Pokédex entry to its Pokémon.',
    group: 'knowledge',
    label: questionLabels['field-notes'],
  },
  'type-check': {
    description: 'Choose one type a Pokémon has.',
    group: 'knowledge',
    label: questionLabels['type-check'],
  },
  'odd-one-out': {
    description: 'Find the Pokémon that breaks a hidden type pattern.',
    group: 'knowledge',
    label: questionLabels['odd-one-out'],
  },
  'type-roundup': {
    description: 'Select every Pokémon with the named type.',
    group: 'knowledge',
    label: questionLabels['type-roundup'],
  },
  'type-twins': {
    description: 'Match both types of a dual-type Pokémon.',
    group: 'knowledge',
    label: questionLabels['type-twins'],
  },
  'legend-hunt': {
    description: 'Select every Legendary or Mythical Pokémon.',
    group: 'knowledge',
    label: questionLabels['legend-hunt'],
  },
  'generation-roundup': {
    description: 'Select every Pokémon introduced in the named generation.',
    group: 'knowledge',
    label: questionLabels['generation-roundup'],
  },
  'evolution-link': {
    description: 'Complete an evolution chain using four name-only choices.',
    group: 'knowledge',
    label: questionLabels['evolution-link'],
  },
  'evolution-shift': {
    description: 'Choose the type a Pokémon gains when it evolves.',
    group: 'knowledge',
    label: questionLabels['evolution-shift'],
  },
  'ability-check': {
    description: 'Choose an ability the named Pokémon can have.',
    group: 'battle',
    label: questionLabels['ability-check'],
  },
  'move-check': {
    description: 'Choose a move the Pokémon learns by leveling up.',
    group: 'battle',
    label: questionLabels['move-check'],
  },
  'stat-showdown': {
    description: 'Find the highest or lowest stat among four Pokémon.',
    group: 'battle',
    label: questionLabels['stat-showdown'],
  },
  'type-matchup': {
    description: 'Choose a type that hits the Pokémon super effectively.',
    group: 'battle',
    label: questionLabels['type-matchup'],
  },
  'counter-pick': {
    description: 'Pick a Pokémon with a super-effective attack type.',
    group: 'battle',
    label: questionLabels['counter-pick'],
  },
} satisfies Record<QuestionType, QuestionDefinition>;

export const questionTypes = Object.keys(questionDefinitions) as QuestionType[];

export const coreQuestionTypes = questionTypes.filter(
  (type) => !['ability-check', 'move-check', 'stat-showdown'].includes(type),
);

const categoryLabels: Record<QuestionCategory, string> = {
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
): string =>
  category === 'cry'
    ? 'Pokémon cry'
    : category === 'scale'
      ? 'Scale comparison'
      : categoryLabels[category];

export const getQuestionTitle = (question: QuestionData): string =>
  question.title ?? getCategoryLabel(question.category);
