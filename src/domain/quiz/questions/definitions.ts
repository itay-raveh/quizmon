import { expansionVariants } from '../question-variants';
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
  'item-identification': {
    description: 'Identify an item from its sprite.',
    group: 'identity',
  },
  'medicine-cabinet': {
    description: 'Choose an item that meets the stated healing requirements.',
    group: 'knowledge',
  },
  'evolution-items': {
    description:
      'Choose the item used directly to evolve the pictured Pokémon.',
    group: 'knowledge',
  },
  'weight-comparison': {
    description: 'Compare Pokémon weights.',
    group: 'knowledge',
  },
  'height-comparison': {
    description: 'Compare Pokémon heights.',
    group: 'knowledge',
  },
  'move-types': { description: 'Identify a move’s type.', group: 'battle' },
  'name-that-region': {
    description: 'Match a location to its region.',
    group: 'knowledge',
  },
  'move-purpose': {
    description: 'Identify physical, special and status moves.',
    group: 'battle',
  },
  'baby-pokemon': {
    description: 'Find a Pokémon classified as a baby.',
    group: 'knowledge',
  },
  'pokedex-categories': {
    description: 'Match a Pokédex category to its Pokémon.',
    group: 'knowledge',
  },
  'evolution-conditions': {
    description: 'Identify a complete evolution method.',
    group: 'knowledge',
  },
  'ability-effects': {
    description: 'Match an ability to its effect.',
    group: 'battle',
  },
  'held-item-effects': {
    description: 'Identify what a held item does.',
    group: 'battle',
  },
  'hidden-abilities': {
    description: 'Identify a Pokémon’s Hidden Ability.',
    group: 'battle',
  },
  'nature-effects': {
    description: 'Match raised and lowered stats to a nature.',
    group: 'battle',
  },
  'egg-group-connections': {
    description: 'Find Pokémon sharing an Egg Group.',
    group: 'knowledge',
  },
  'ev-yields': {
    description: 'Identify the base effort values awarded by a Pokémon.',
    group: 'battle',
  },
  'encounter-locations': {
    description:
      'Identify a Pokémon encountered in a stated game and location.',
    group: 'knowledge',
  },
  'berry-flavors': {
    description: 'Identify a berry’s flavors.',
    group: 'knowledge',
  },
  'natural-gift': {
    description: 'Identify Natural Gift’s type from its berry.',
    group: 'battle',
  },

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
    description: 'Identify a Pokémon’s typing.',
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
  (type) =>
    !Object.hasOwn(expansionVariants, type) &&
    !['ability-check', 'move-check', 'stat-showdown'].includes(type),
);
