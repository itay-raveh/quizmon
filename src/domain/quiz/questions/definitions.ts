import { questionRules } from '../question-rules/registry.ts';
import type { TrainerSpecialty } from '../../player/trainer-progression.ts';
import type { QuestionCategory } from '../types.ts';
import { subjectKinds } from '../types.ts';

interface QuestionDefinition {
  category: QuestionCategory;
  subjectKind: (typeof subjectKinds)[number];
  answerIsPokemon: boolean;
  description: string;
  group: QuestionTypeGroup;
  label: string;
  specialty: TrainerSpecialty;
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
  itemIdentification: {
    category: 'knowledge',
    subjectKind: 'item',
    answerIsPokemon: false,
    label: 'Item identification',
    specialty: 'item',
    description: 'Identify an item from its sprite.',
    group: 'identity',
  },
  itemUses: {
    category: 'knowledge',
    subjectKind: 'item',
    answerIsPokemon: false,
    label: 'Item uses',
    specialty: 'item',
    description: 'Identify what an item does.',
    group: 'knowledge',
  },
  weightComparison: {
    category: 'knowledge',
    subjectKind: 'pokemon',
    answerIsPokemon: true,
    label: 'Weight comparison',
    specialty: 'description',
    description: 'Compare Pokémon weights.',
    group: 'knowledge',
  },
  heightComparison: {
    category: 'knowledge',
    subjectKind: 'pokemon',
    answerIsPokemon: true,
    label: 'Height comparison',
    specialty: 'description',
    description: 'Compare Pokémon heights.',
    group: 'knowledge',
  },
  moveTypes: {
    category: 'move',
    subjectKind: 'move',
    answerIsPokemon: false,
    label: 'Move types',
    specialty: 'move',
    description: 'Identify a move’s type.',
    group: 'battle',
  },
  locationRegion: {
    category: 'knowledge',
    subjectKind: 'location',
    answerIsPokemon: false,
    label: 'Name that region',
    specialty: 'description',
    description: 'Match a location to its region.',
    group: 'knowledge',
  },
  moveCategory: {
    category: 'move',
    subjectKind: 'move',
    answerIsPokemon: false,
    label: 'Move purpose',
    specialty: 'move',
    description: 'Identify physical, special and status moves.',
    group: 'battle',
  },
  pokedexCategories: {
    category: 'description',
    subjectKind: 'pokemon',
    answerIsPokemon: true,
    label: 'Pokédex categories',
    specialty: 'description',
    description: 'Match a Pokédex category to its Pokémon.',
    group: 'knowledge',
  },
  evolutionConditions: {
    category: 'evolution',
    subjectKind: 'pokemon',
    answerIsPokemon: false,
    label: 'Evolution conditions',
    specialty: 'evolution',
    description: 'Identify a complete evolution method.',
    group: 'knowledge',
  },
  abilityEffects: {
    category: 'ability',
    subjectKind: 'ability',
    answerIsPokemon: false,
    label: 'Ability effects',
    specialty: 'ability',
    description: 'Identify an ability from its effect.',
    group: 'battle',
  },
  heldItemEffects: {
    category: 'knowledge',
    subjectKind: 'item',
    answerIsPokemon: false,
    label: 'Held-item effects',
    specialty: 'item',
    description: 'Identify what a held item does.',
    group: 'battle',
  },
  hiddenAbilities: {
    category: 'ability',
    subjectKind: 'pokemon',
    answerIsPokemon: false,
    label: 'Hidden abilities',
    specialty: 'ability',
    description: 'Identify a Pokémon’s Hidden Ability.',
    group: 'battle',
  },
  natureEffects: {
    category: 'stat',
    subjectKind: 'nature',
    answerIsPokemon: false,
    label: 'Nature effects',
    specialty: 'stat',
    description: 'Match raised and lowered stats to a nature.',
    group: 'battle',
  },
  evYields: {
    category: 'stat',
    subjectKind: 'pokemon',
    answerIsPokemon: false,
    label: 'EV yields',
    specialty: 'stat',
    description: 'Identify the base effort values awarded by a Pokémon.',
    group: 'battle',
  },
  encounterLocations: {
    category: 'knowledge',
    subjectKind: 'location',
    answerIsPokemon: true,
    label: 'Encounter locations',
    specialty: 'description',
    description:
      'Identify a Pokémon encountered in a stated game and location.',
    group: 'knowledge',
  },
  berryFlavors: {
    category: 'knowledge',
    subjectKind: 'berry',
    answerIsPokemon: false,
    label: 'Berry flavors',
    specialty: 'berry',
    description: 'Identify a berry’s flavors.',
    group: 'knowledge',
  },
  naturalGift: {
    category: 'knowledge',
    subjectKind: 'berry',
    answerIsPokemon: false,
    label: 'Natural Gift',
    specialty: 'berry',
    description: 'Identify Natural Gift’s type from its berry.',
    group: 'battle',
  },

  pokemonFromHistoricalSprite: {
    category: 'identity',
    subjectKind: 'pokemon',
    answerIsPokemon: true,
    label: 'Pokédex scan',
    specialty: 'identity',
    description: 'Identify Pokémon across generations of game sprites.',
    group: 'identity',
  },
  silhouetteForPokemon: {
    category: 'identity',
    subjectKind: 'pokemon',
    answerIsPokemon: true,
    label: 'Silhouette match',
    specialty: 'identity',
    description: 'Pick the silhouette of a named Pokémon.',
    group: 'identity',
  },
  spriteForPokemon: {
    category: 'identity',
    subjectKind: 'pokemon',
    answerIsPokemon: true,
    label: 'Sprite match',
    specialty: 'identity',
    description: 'Pick the sprite of a named Pokémon.',
    group: 'identity',
  },
  pokemonFromSilhouette: {
    category: 'identity',
    subjectKind: 'pokemon',
    answerIsPokemon: true,
    label: 'Who’s that Pokémon?',
    specialty: 'identity',
    description: 'Name the Pokémon hidden in a silhouette.',
    group: 'identity',
  },
  pokemonFromPixelCrop: {
    category: 'identity',
    subjectKind: 'pokemon',
    answerIsPokemon: true,
    label: 'Pixel peek',
    specialty: 'identity',
    description: 'Name a Pokémon from a tiny sprite crop.',
    group: 'identity',
  },
  shinyPokemonIdentification: {
    category: 'identity',
    subjectKind: 'pokemon',
    answerIsPokemon: true,
    label: 'Shiny spotter',
    specialty: 'identity',
    description: 'Find the Pokémon shown in shiny colors.',
    group: 'identity',
  },
  pokedexEntryMatch: {
    category: 'description',
    subjectKind: 'pokemon',
    answerIsPokemon: true,
    label: 'Field notes',
    specialty: 'description',
    description: 'Match a Pokédex entry to its Pokémon.',
    group: 'knowledge',
  },
  pokemonTypes: {
    category: 'type',
    subjectKind: 'pokemon',
    answerIsPokemon: false,
    label: 'Type check',
    specialty: 'type',
    description: 'Identify a Pokémon’s typing.',
    group: 'knowledge',
  },
  typeOddOneOut: {
    category: 'type',
    subjectKind: 'pokemon',
    answerIsPokemon: true,
    label: 'Odd one out',
    specialty: 'type',
    description:
      'Three Pokémon share a type. Choose the Pokémon that does not have that type.',
    group: 'knowledge',
  },
  pokemonByType: {
    category: 'type',
    subjectKind: 'pokemon',
    answerIsPokemon: true,
    label: 'Type roundup',
    specialty: 'type',
    description: 'Select every Pokémon with the named type.',
    group: 'knowledge',
  },
  dualTypeMatch: {
    category: 'type',
    subjectKind: 'pokemon',
    answerIsPokemon: true,
    label: 'Type twins',
    specialty: 'type',
    description: 'Match both types of a dual-type Pokémon.',
    group: 'knowledge',
  },
  legendaryMythicalSelection: {
    category: 'identity',
    subjectKind: 'pokemon',
    answerIsPokemon: true,
    label: 'Legend hunt',
    specialty: 'identity',
    description: 'Select every Legendary or Mythical Pokémon.',
    group: 'knowledge',
  },
  pokemonByGeneration: {
    category: 'identity',
    subjectKind: 'pokemon',
    answerIsPokemon: true,
    label: 'Generation roundup',
    specialty: 'identity',
    description: 'Select every Pokémon introduced in the named generation.',
    group: 'knowledge',
  },
  evolutionChain: {
    category: 'evolution',
    subjectKind: 'pokemon',
    answerIsPokemon: true,
    label: 'Evolution link',
    specialty: 'evolution',
    description: 'Complete an evolution chain using four name-only choices.',
    group: 'knowledge',
  },
  evolutionGainedType: {
    category: 'evolution',
    subjectKind: 'pokemon',
    answerIsPokemon: false,
    label: 'Evolution shift',
    specialty: 'evolution',
    description: 'Choose the type a Pokémon gains when it evolves.',
    group: 'knowledge',
  },
  pokemonAbilities: {
    category: 'ability',
    subjectKind: 'pokemon',
    answerIsPokemon: false,
    label: 'Ability check',
    league: false,
    specialty: 'ability',
    description: 'Choose an ability the named Pokémon can have.',
    group: 'battle',
  },
  levelUpMoves: {
    category: 'move',
    subjectKind: 'pokemon',
    answerIsPokemon: false,
    label: 'Move check',
    league: false,
    specialty: 'move',
    description: 'Choose a move the Pokémon learns by leveling up.',
    group: 'battle',
  },
  statExtremes: {
    category: 'stat',
    subjectKind: 'pokemon',
    answerIsPokemon: true,
    label: 'Stat showdown',
    league: false,
    specialty: 'stat',
    description: 'Find the highest or lowest stat among four Pokémon.',
    group: 'battle',
  },
  typeMatchup: {
    category: 'matchup',
    subjectKind: 'pokemon',
    answerIsPokemon: false,
    label: 'Type matchup',
    specialty: 'matchup',
    description: 'Choose a type that hits the Pokémon super effectively.',
    group: 'battle',
  },
  superEffectiveAttacker: {
    category: 'matchup',
    subjectKind: 'pokemon',
    answerIsPokemon: true,
    label: 'Counter pick',
    specialty: 'matchup',
    description: 'Pick a Pokémon with a super-effective attack type.',
    group: 'battle',
  },
} satisfies Record<string, QuestionDefinition>;

/** Current persisted family IDs, derived from the definitions without a second enum. */
export type QuestionType = keyof typeof questionDefinitions;
export const questionTypes = Object.keys(questionDefinitions) as QuestionType[];
const unleveledQuestionTypes = questionTypes.filter(
  (type) => 'unleveled' in questionRules[type],
);
export const leagueQuestionTypes = unleveledQuestionTypes.filter(
  (type) => !('league' in questionDefinitions[type]),
);
export const supportsUnleveledQuestion = (type: QuestionType | 'champion') =>
  type === 'champion' || unleveledQuestionTypes.includes(type);

export const getQuestionTitle = (question: {
  questionType: QuestionType | 'champion';
}): string =>
  question.questionType === 'champion'
    ? 'Champion question'
    : questionDefinitions[question.questionType].label;

const categoryLabels: Record<QuestionCategory, string> = {
  knowledge: 'General knowledge',
  ability: questionDefinitions.pokemonAbilities.label,
  champion: 'Champion question',
  description: questionDefinitions.pokedexEntryMatch.label,
  evolution: questionDefinitions.evolutionGainedType.label,
  identity: questionDefinitions.pokemonFromHistoricalSprite.label,
  matchup: questionDefinitions.typeMatchup.label,
  move: questionDefinitions.levelUpMoves.label,
  stat: questionDefinitions.statExtremes.label,
  type: questionDefinitions.pokemonTypes.label,
};

export const getCategoryLabel = (category: QuestionCategory): string =>
  categoryLabels[category];
