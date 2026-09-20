import type { TrainerSpecialty } from '../../player/trainer-progression.ts';
import type { QuestionType } from '../types.ts';

interface QuestionDefinition {
  description: string;
  group: QuestionTypeGroup;
  specialty: TrainerSpecialty;
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
    specialty: 'item',
    description: 'Identify an item from its sprite.',
    group: 'identity',
  },
  'medicine-cabinet': {
    specialty: 'item',
    description: 'Choose an item that meets the stated healing requirements.',
    group: 'knowledge',
  },
  'evolution-items': {
    specialty: 'evolution',
    description:
      'Choose the item used directly to evolve the pictured Pokémon.',
    group: 'knowledge',
  },
  'weight-comparison': {
    specialty: 'description',
    description: 'Compare Pokémon weights.',
    group: 'knowledge',
  },
  'height-comparison': {
    specialty: 'description',
    description: 'Compare Pokémon heights.',
    group: 'knowledge',
  },
  'move-types': {
    specialty: 'move',
    description: 'Identify a move’s type.',
    group: 'battle',
  },
  'name-that-region': {
    specialty: 'description',
    description: 'Match a location to its region.',
    group: 'knowledge',
  },
  'move-purpose': {
    specialty: 'move',
    description: 'Identify physical, special and status moves.',
    group: 'battle',
  },
  'pokedex-categories': {
    specialty: 'description',
    description: 'Match a Pokédex category to its Pokémon.',
    group: 'knowledge',
  },
  'evolution-conditions': {
    specialty: 'evolution',
    description: 'Identify a complete evolution method.',
    group: 'knowledge',
  },
  'ability-effects': {
    specialty: 'ability',
    description: 'Match an ability to its effect.',
    group: 'battle',
  },
  'held-item-effects': {
    specialty: 'item',
    description: 'Identify what a held item does.',
    group: 'battle',
  },
  'hidden-abilities': {
    specialty: 'ability',
    description: 'Identify a Pokémon’s Hidden Ability.',
    group: 'battle',
  },
  'nature-effects': {
    specialty: 'stat',
    description: 'Match raised and lowered stats to a nature.',
    group: 'battle',
  },
  'ev-yields': {
    specialty: 'stat',
    description: 'Identify the base effort values awarded by a Pokémon.',
    group: 'battle',
  },
  'encounter-locations': {
    specialty: 'description',
    description:
      'Identify a Pokémon encountered in a stated game and location.',
    group: 'knowledge',
  },
  'berry-flavors': {
    specialty: 'item',
    description: 'Identify a berry’s flavors.',
    group: 'knowledge',
  },
  'natural-gift': {
    specialty: 'item',
    description: 'Identify Natural Gift’s type from its berry.',
    group: 'battle',
  },

  'pokedex-scan': {
    specialty: 'identity',
    description: 'Identify Pokémon across generations of game sprites.',
    group: 'identity',
  },
  'silhouette-match': {
    specialty: 'identity',
    description: 'Pick the silhouette of a named Pokémon.',
    group: 'identity',
  },
  'sprite-match': {
    specialty: 'identity',
    description: 'Pick the sprite of a named Pokémon.',
    group: 'identity',
  },
  'whos-that-pokemon': {
    specialty: 'identity',
    description: 'Name the Pokémon hidden in a silhouette.',
    group: 'identity',
  },
  'pixel-peek': {
    specialty: 'identity',
    description: 'Name a Pokémon from a tiny sprite crop.',
    group: 'identity',
  },
  'shiny-spotter': {
    specialty: 'identity',
    description: 'Find the Pokémon shown in shiny colors.',
    group: 'identity',
  },
  'field-notes': {
    specialty: 'description',
    description: 'Match a Pokédex entry to its Pokémon.',
    group: 'knowledge',
  },
  'type-check': {
    specialty: 'type',
    description: 'Identify a Pokémon’s typing.',
    group: 'knowledge',
  },
  'odd-one-out': {
    specialty: 'type',
    description:
      'Three Pokémon share a type. Choose the Pokémon that does not have that type.',
    group: 'knowledge',
  },
  'type-roundup': {
    specialty: 'type',
    description: 'Select every Pokémon with the named type.',
    group: 'knowledge',
  },
  'type-twins': {
    specialty: 'type',
    description: 'Match both types of a dual-type Pokémon.',
    group: 'knowledge',
  },
  'legend-hunt': {
    specialty: 'identity',
    description: 'Select every Legendary or Mythical Pokémon.',
    group: 'knowledge',
  },
  'generation-roundup': {
    specialty: 'identity',
    description: 'Select every Pokémon introduced in the named generation.',
    group: 'knowledge',
  },
  'evolution-link': {
    specialty: 'evolution',
    description: 'Complete an evolution chain using four name-only choices.',
    group: 'knowledge',
  },
  'evolution-shift': {
    specialty: 'evolution',
    description: 'Choose the type a Pokémon gains when it evolves.',
    group: 'knowledge',
  },
  'ability-check': {
    specialty: 'ability',
    description: 'Choose an ability the named Pokémon can have.',
    group: 'battle',
  },
  'move-check': {
    specialty: 'move',
    description: 'Choose a move the Pokémon learns by leveling up.',
    group: 'battle',
  },
  'stat-showdown': {
    specialty: 'stat',
    description: 'Find the highest or lowest stat among four Pokémon.',
    group: 'battle',
  },
  'type-matchup': {
    specialty: 'matchup',
    description: 'Choose a type that hits the Pokémon super effectively.',
    group: 'battle',
  },
  'counter-pick': {
    specialty: 'matchup',
    description: 'Pick a Pokémon with a super-effective attack type.',
    group: 'battle',
  },
} satisfies Record<QuestionType, QuestionDefinition>;

export const questionTypes = Object.keys(questionDefinitions) as QuestionType[];
