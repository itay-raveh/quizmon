import type { TrainerSpecialty } from '../../player/trainer-progression.ts';
import type { QuestionCategory } from '../types.ts';

interface QuestionDefinition {
  description: string;
  group: QuestionTypeGroup;
  label: string;
  specialty: TrainerSpecialty;
  standard?: boolean;
  league?: boolean;
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
    label: 'Item identification',
    specialty: 'item',
    description: 'Identify an item from its sprite.',
    group: 'identity',
  },
  'medicine-cabinet': {
    label: 'Medicine cabinet',
    specialty: 'item',
    description: 'Choose an item that meets the stated healing requirements.',
    group: 'knowledge',
  },
  'evolution-items': {
    label: 'Evolution items',
    specialty: 'evolution',
    description:
      'Choose the item used directly to evolve the pictured Pokémon.',
    group: 'knowledge',
  },
  'weight-comparison': {
    label: 'Weight comparison',
    specialty: 'description',
    description: 'Compare Pokémon weights.',
    group: 'knowledge',
  },
  'height-comparison': {
    label: 'Height comparison',
    specialty: 'description',
    description: 'Compare Pokémon heights.',
    group: 'knowledge',
  },
  'move-types': {
    label: 'Move types',
    specialty: 'move',
    description: 'Identify a move’s type.',
    group: 'battle',
  },
  'name-that-region': {
    label: 'Name that region',
    specialty: 'description',
    description: 'Match a location to its region.',
    group: 'knowledge',
  },
  'move-purpose': {
    label: 'Move purpose',
    specialty: 'move',
    description: 'Identify physical, special and status moves.',
    group: 'battle',
  },
  'pokedex-categories': {
    label: 'Pokédex categories',
    specialty: 'description',
    description: 'Match a Pokédex category to its Pokémon.',
    group: 'knowledge',
  },
  'evolution-conditions': {
    label: 'Evolution conditions',
    specialty: 'evolution',
    description: 'Identify a complete evolution method.',
    group: 'knowledge',
  },
  'ability-effects': {
    label: 'Ability effects',
    specialty: 'ability',
    description: 'Match an ability to its effect.',
    group: 'battle',
  },
  'held-item-effects': {
    label: 'Held-item effects',
    specialty: 'item',
    description: 'Identify what a held item does.',
    group: 'battle',
  },
  'hidden-abilities': {
    label: 'Hidden abilities',
    specialty: 'ability',
    description: 'Identify a Pokémon’s Hidden Ability.',
    group: 'battle',
  },
  'nature-effects': {
    label: 'Nature effects',
    specialty: 'stat',
    description: 'Match raised and lowered stats to a nature.',
    group: 'battle',
  },
  'ev-yields': {
    label: 'EV yields',
    specialty: 'stat',
    description: 'Identify the base effort values awarded by a Pokémon.',
    group: 'battle',
  },
  'encounter-locations': {
    label: 'Encounter locations',
    specialty: 'description',
    description:
      'Identify a Pokémon encountered in a stated game and location.',
    group: 'knowledge',
  },
  'berry-flavors': {
    label: 'Berry flavors',
    specialty: 'berry',
    description: 'Identify a berry’s flavors.',
    group: 'knowledge',
  },
  'natural-gift': {
    label: 'Natural Gift',
    specialty: 'berry',
    description: 'Identify Natural Gift’s type from its berry.',
    group: 'battle',
  },

  'pokedex-scan': {
    label: 'Pokédex scan',
    standard: true,
    specialty: 'identity',
    description: 'Identify Pokémon across generations of game sprites.',
    group: 'identity',
  },
  'silhouette-match': {
    label: 'Silhouette match',
    standard: true,
    specialty: 'identity',
    description: 'Pick the silhouette of a named Pokémon.',
    group: 'identity',
  },
  'sprite-match': {
    label: 'Sprite match',
    standard: true,
    specialty: 'identity',
    description: 'Pick the sprite of a named Pokémon.',
    group: 'identity',
  },
  'whos-that-pokemon': {
    label: 'Who’s that Pokémon?',
    standard: true,
    specialty: 'identity',
    description: 'Name the Pokémon hidden in a silhouette.',
    group: 'identity',
  },
  'pixel-peek': {
    label: 'Pixel peek',
    standard: true,
    specialty: 'identity',
    description: 'Name a Pokémon from a tiny sprite crop.',
    group: 'identity',
  },
  'shiny-spotter': {
    label: 'Shiny spotter',
    standard: true,
    specialty: 'identity',
    description: 'Find the Pokémon shown in shiny colors.',
    group: 'identity',
  },
  'field-notes': {
    label: 'Field notes',
    standard: true,
    specialty: 'description',
    description: 'Match a Pokédex entry to its Pokémon.',
    group: 'knowledge',
  },
  'type-check': {
    label: 'Type check',
    standard: true,
    specialty: 'type',
    description: 'Identify a Pokémon’s typing.',
    group: 'knowledge',
  },
  'odd-one-out': {
    label: 'Odd one out',
    standard: true,
    specialty: 'type',
    description:
      'Three Pokémon share a type. Choose the Pokémon that does not have that type.',
    group: 'knowledge',
  },
  'type-roundup': {
    label: 'Type roundup',
    standard: true,
    specialty: 'type',
    description: 'Select every Pokémon with the named type.',
    group: 'knowledge',
  },
  'type-twins': {
    label: 'Type twins',
    standard: true,
    specialty: 'type',
    description: 'Match both types of a dual-type Pokémon.',
    group: 'knowledge',
  },
  'legend-hunt': {
    label: 'Legend hunt',
    standard: true,
    specialty: 'identity',
    description: 'Select every Legendary or Mythical Pokémon.',
    group: 'knowledge',
  },
  'generation-roundup': {
    label: 'Generation roundup',
    standard: true,
    specialty: 'identity',
    description: 'Select every Pokémon introduced in the named generation.',
    group: 'knowledge',
  },
  'evolution-link': {
    label: 'Evolution link',
    standard: true,
    specialty: 'evolution',
    description: 'Complete an evolution chain using four name-only choices.',
    group: 'knowledge',
  },
  'evolution-shift': {
    label: 'Evolution shift',
    standard: true,
    specialty: 'evolution',
    description: 'Choose the type a Pokémon gains when it evolves.',
    group: 'knowledge',
  },
  'ability-check': {
    label: 'Ability check',
    standard: true,
    league: false,
    specialty: 'ability',
    description: 'Choose an ability the named Pokémon can have.',
    group: 'battle',
  },
  'move-check': {
    label: 'Move check',
    standard: true,
    league: false,
    specialty: 'move',
    description: 'Choose a move the Pokémon learns by leveling up.',
    group: 'battle',
  },
  'stat-showdown': {
    label: 'Stat showdown',
    standard: true,
    league: false,
    specialty: 'stat',
    description: 'Find the highest or lowest stat among four Pokémon.',
    group: 'battle',
  },
  'type-matchup': {
    label: 'Type matchup',
    standard: true,
    specialty: 'matchup',
    description: 'Choose a type that hits the Pokémon super effectively.',
    group: 'battle',
  },
  'counter-pick': {
    label: 'Counter pick',
    standard: true,
    specialty: 'matchup',
    description: 'Pick a Pokémon with a super-effective attack type.',
    group: 'battle',
  },
} satisfies Record<string, QuestionDefinition>;

export type QuestionType = keyof typeof questionDefinitions;
export const questionTypes = Object.keys(questionDefinitions) as QuestionType[];
const standardQuestionTypes = questionTypes.filter(
  (type) => 'standard' in questionDefinitions[type],
);
export const standardLeagueQuestionTypes = standardQuestionTypes.filter(
  (type) => !('league' in questionDefinitions[type]),
);
export const supportsStandardQuestion = (type: QuestionType | 'champion') =>
  type === 'champion' || standardQuestionTypes.includes(type);

export const getQuestionTitle = (question: {
  questionType: QuestionType | 'champion';
}): string =>
  question.questionType === 'champion'
    ? 'Champion question'
    : questionDefinitions[question.questionType].label;

const categoryLabels: Record<QuestionCategory, string> = {
  knowledge: 'General knowledge',
  ability: questionDefinitions['ability-check'].label,
  champion: 'Champion question',
  description: questionDefinitions['field-notes'].label,
  evolution: questionDefinitions['evolution-shift'].label,
  identity: questionDefinitions['pokedex-scan'].label,
  matchup: questionDefinitions['type-matchup'].label,
  move: questionDefinitions['move-check'].label,
  stat: questionDefinitions['stat-showdown'].label,
  type: questionDefinitions['type-check'].label,
};

export const getCategoryLabel = (category: QuestionCategory): string =>
  categoryLabels[category];
