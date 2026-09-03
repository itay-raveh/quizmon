import type { QuestionCategory, QuestionData, QuestionType } from '../types';
import { buildCounterPickQuestion, buildMatchupQuestion } from './battle';
import { buildChampionQuestion } from './champion';
import {
  buildBattleViewQuestion,
  buildPixelPeekQuestion,
  buildPokedexScanQuestion,
  buildShinySpotterQuestion,
  buildSilhouetteMatchQuestion,
} from './identity';
import {
  buildChooseAllTypeQuestion,
  buildDescriptionQuestion,
  buildEvolutionShiftQuestion,
  buildOddOneOutQuestion,
  buildPropertyQuestion,
  buildStatQuestion,
  buildTypeQuestion,
} from './knowledge';
import {
  addQuestionVisuals,
  type QuestionBuilder,
  type QuestionContext,
} from './shared';

interface QuestionDefinition {
  build: QuestionBuilder;
  category: QuestionCategory;
  description: string;
  group: QuestionTypeGroup;
  label: string;
}

export const questionTypeGroups = [
  {
    description: 'Recognize Pokémon from their artwork and appearance.',
    id: 'identity',
    label: 'Identity',
  },
  {
    description: 'Recall types, Pokédex entries, and evolution changes.',
    id: 'knowledge',
    label: 'General knowledge',
  },
  {
    description: 'Use moves, abilities, stats, and type matchups.',
    id: 'battle',
    label: 'Battle knowledge',
  },
] as const;

export type QuestionTypeGroup = (typeof questionTypeGroups)[number]['id'];

export const questionRegistry = {
  'pokedex-scan': {
    build: buildPokedexScanQuestion,
    category: 'identity',
    description: 'Name a Pokémon from its front sprite.',
    group: 'identity',
    label: 'Pokédex scan',
  },
  'silhouette-match': {
    build: buildSilhouetteMatchQuestion,
    category: 'identity',
    description: 'Pick the silhouette of a named Pokémon.',
    group: 'identity',
    label: 'Silhouette match',
  },
  'pixel-peek': {
    build: buildPixelPeekQuestion,
    category: 'identity',
    description: 'Name a Pokémon from a tiny sprite crop.',
    group: 'identity',
    label: 'Pixel peek',
  },
  'shiny-spotter': {
    build: buildShinySpotterQuestion,
    category: 'identity',
    description: 'Find the Pokémon shown in shiny colors.',
    group: 'identity',
    label: 'Shiny spotter',
  },
  'battle-view': {
    build: buildBattleViewQuestion,
    category: 'identity',
    description: 'Name a Pokémon from its back sprite.',
    group: 'identity',
    label: 'Battle view',
  },
  'field-notes': {
    build: buildDescriptionQuestion,
    category: 'description',
    description: 'Match a Pokédex entry to its Pokémon.',
    group: 'knowledge',
    label: 'Field notes',
  },
  'type-check': {
    build: buildTypeQuestion,
    category: 'type',
    description: 'Choose one type a Pokémon has.',
    group: 'knowledge',
    label: 'Type check',
  },
  'odd-one-out': {
    build: buildOddOneOutQuestion,
    category: 'type',
    description: 'Find the Pokémon that breaks a hidden type pattern.',
    group: 'knowledge',
    label: 'Odd one out',
  },
  'type-roundup': {
    build: buildChooseAllTypeQuestion,
    category: 'type',
    description: 'Select every Pokémon with the named type.',
    group: 'knowledge',
    label: 'Type roundup',
  },
  'evolution-shift': {
    build: buildEvolutionShiftQuestion,
    category: 'evolution',
    description: 'Choose the type a Pokémon gains when it evolves.',
    group: 'knowledge',
    label: 'Evolution shift',
  },
  'ability-check': {
    build: buildPropertyQuestion('ability'),
    category: 'ability',
    description: 'Choose an ability the named Pokémon can have.',
    group: 'battle',
    label: 'Ability check',
  },
  'move-check': {
    build: buildPropertyQuestion('move'),
    category: 'move',
    description: 'Choose a move the Pokémon learns by leveling up.',
    group: 'battle',
    label: 'Move check',
  },
  'stat-showdown': {
    build: buildStatQuestion,
    category: 'stat',
    description: 'Find the highest base stat among four Pokémon.',
    group: 'battle',
    label: 'Stat showdown',
  },
  'type-matchup': {
    build: buildMatchupQuestion,
    category: 'matchup',
    description: 'Choose a type that hits the Pokémon super effectively.',
    group: 'battle',
    label: 'Type matchup',
  },
  'counter-pick': {
    build: buildCounterPickQuestion,
    category: 'matchup',
    description: 'Pick a Pokémon with a super-effective attack type.',
    group: 'battle',
    label: 'Counter pick',
  },
} satisfies Record<QuestionType, QuestionDefinition>;

export const questionTypes = Object.keys(questionRegistry) as QuestionType[];

const championDefinition: QuestionDefinition = {
  build: buildChampionQuestion,
  category: 'champion',
  description: 'Name a Pokémon before revealing optional clues.',
  group: 'identity',
  label: 'Champion question',
};

export const buildQuestionType = (
  context: QuestionContext,
  questionType: QuestionType | 'champion',
): QuestionData | undefined => {
  const definition =
    questionType === 'champion'
      ? championDefinition
      : questionRegistry[questionType];
  const question = definition.build(context);
  return question ? addQuestionVisuals(context, question) : undefined;
};
