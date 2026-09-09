import type { QuestionType } from '../types';

interface QuestionDefinition {
  description: string;
  group: QuestionTypeGroup;
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
  },
  'silhouette-match': {
    description: 'Pick the silhouette of a named Pokémon.',
    group: 'identity',
  },
  'sprite-match': {
    description: 'Pick the sprite of a named Pokémon.',
    group: 'identity',
  },
  'whos-that-pokemon': {
    description: 'Name the Pokémon hidden in a silhouette.',
    group: 'identity',
  },
  'pixel-peek': {
    description: 'Name a Pokémon from a tiny sprite crop.',
    group: 'identity',
  },
  'shiny-spotter': {
    description: 'Find the Pokémon shown in shiny colors.',
    group: 'identity',
  },
  'field-notes': {
    description: 'Match a Pokédex entry to its Pokémon.',
    group: 'knowledge',
  },
  'type-check': {
    description: 'Choose one type a Pokémon has.',
    group: 'knowledge',
  },
  'odd-one-out': {
    description:
      'Three Pokémon share a type. Choose the Pokémon that does not have that type.',
    group: 'knowledge',
  },
  'type-roundup': {
    description: 'Select every Pokémon with the named type.',
    group: 'knowledge',
  },
  'type-twins': {
    description: 'Match both types of a dual-type Pokémon.',
    group: 'knowledge',
  },
  'legend-hunt': {
    description: 'Select every Legendary or Mythical Pokémon.',
    group: 'knowledge',
  },
  'generation-roundup': {
    description: 'Select every Pokémon introduced in the named generation.',
    group: 'knowledge',
  },
  'evolution-link': {
    description: 'Complete an evolution chain using four name-only choices.',
    group: 'knowledge',
  },
  'evolution-shift': {
    description: 'Choose the type a Pokémon gains when it evolves.',
    group: 'knowledge',
  },
  'ability-check': {
    description: 'Choose an ability the named Pokémon can have.',
    group: 'battle',
  },
  'move-check': {
    description: 'Choose a move the Pokémon learns by leveling up.',
    group: 'battle',
  },
  'stat-showdown': {
    description: 'Find the highest or lowest stat among four Pokémon.',
    group: 'battle',
  },
  'type-matchup': {
    description: 'Choose a type that hits the Pokémon super effectively.',
    group: 'battle',
  },
  'counter-pick': {
    description: 'Pick a Pokémon with a super-effective attack type.',
    group: 'battle',
  },
} satisfies Record<QuestionType, QuestionDefinition>;

export const questionTypes = Object.keys(questionDefinitions) as QuestionType[];

export const coreQuestionTypes = questionTypes.filter(
  (type) => !['ability-check', 'move-check', 'stat-showdown'].includes(type),
);
