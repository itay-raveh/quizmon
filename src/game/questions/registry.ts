import { questionLabels } from '../question-labels';
import type { QuestionData, QuestionType } from '../types';
import { buildCounterPickQuestion, buildMatchupQuestion } from './battle';
import { buildChampionQuestion } from './champion';
import {
  buildTypeTwinsQuestion,
  buildLegendHuntQuestion,
} from './twins-and-legends';
import {
  buildEvolutionLinkQuestion,
  buildGenerationRoundupQuestion,
} from './lineage';
import {
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

export const questionRegistry = {
  'pokedex-scan': {
    build: buildPokedexScanQuestion,
    description: 'Identify Pokémon across generations of game sprites.',
    group: 'identity',
    label: questionLabels['pokedex-scan'],
  },
  'silhouette-match': {
    build: buildSilhouetteMatchQuestion,
    description: 'Pick the silhouette of a named Pokémon.',
    group: 'identity',
    label: questionLabels['silhouette-match'],
  },
  'pixel-peek': {
    build: buildPixelPeekQuestion,
    description: 'Name a Pokémon from a tiny sprite crop.',
    group: 'identity',
    label: questionLabels['pixel-peek'],
  },
  'shiny-spotter': {
    build: buildShinySpotterQuestion,
    description: 'Find the Pokémon shown in shiny colors.',
    group: 'identity',
    label: questionLabels['shiny-spotter'],
  },
  'field-notes': {
    build: buildDescriptionQuestion,
    description: 'Match a Pokédex entry to its Pokémon.',
    group: 'knowledge',
    label: questionLabels['field-notes'],
  },
  'type-check': {
    build: buildTypeQuestion,
    description: 'Choose one type a Pokémon has.',
    group: 'knowledge',
    label: questionLabels['type-check'],
  },
  'odd-one-out': {
    build: buildOddOneOutQuestion,
    description: 'Find the Pokémon that breaks a hidden type pattern.',
    group: 'knowledge',
    label: questionLabels['odd-one-out'],
  },
  'type-roundup': {
    build: buildChooseAllTypeQuestion,
    description: 'Select every Pokémon with the named type.',
    group: 'knowledge',
    label: questionLabels['type-roundup'],
  },
  'type-twins': {
    build: buildTypeTwinsQuestion,
    description: 'Match both types of a dual-type Pokémon.',
    group: 'knowledge',
    label: questionLabels['type-twins'],
  },
  'legend-hunt': {
    build: buildLegendHuntQuestion,
    description: 'Select every Legendary or Mythical Pokémon.',
    group: 'knowledge',
    label: questionLabels['legend-hunt'],
  },
  'generation-roundup': {
    build: buildGenerationRoundupQuestion,
    description: 'Select every Pokémon introduced in the named generation.',
    group: 'knowledge',
    label: questionLabels['generation-roundup'],
  },
  'evolution-link': {
    build: buildEvolutionLinkQuestion,
    description: 'Complete an evolution chain using four name-only choices.',
    group: 'knowledge',
    label: questionLabels['evolution-link'],
  },
  'evolution-shift': {
    build: buildEvolutionShiftQuestion,
    description: 'Choose the type a Pokémon gains when it evolves.',
    group: 'knowledge',
    label: questionLabels['evolution-shift'],
  },
  'ability-check': {
    build: buildPropertyQuestion('ability'),
    description: 'Choose an ability the named Pokémon can have.',
    group: 'battle',
    label: questionLabels['ability-check'],
  },
  'move-check': {
    build: buildPropertyQuestion('move'),
    description: 'Choose a move the Pokémon learns by leveling up.',
    group: 'battle',
    label: questionLabels['move-check'],
  },
  'stat-showdown': {
    build: buildStatQuestion,
    description: 'Find the highest or lowest stat among four Pokémon.',
    group: 'battle',
    label: questionLabels['stat-showdown'],
  },
  'type-matchup': {
    build: buildMatchupQuestion,
    description: 'Choose a type that hits the Pokémon super effectively.',
    group: 'battle',
    label: questionLabels['type-matchup'],
  },
  'counter-pick': {
    build: buildCounterPickQuestion,
    description: 'Pick a Pokémon with a super-effective attack type.',
    group: 'battle',
    label: questionLabels['counter-pick'],
  },
} satisfies Record<QuestionType, QuestionDefinition>;

export const questionTypes = Object.keys(questionRegistry) as QuestionType[];

export const coreQuestionTypes = questionTypes.filter(
  (type) => !['ability-check', 'move-check', 'stat-showdown'].includes(type),
);

export const buildQuestionType = (
  context: QuestionContext,
  questionType: QuestionData['questionType'],
): QuestionData | undefined => {
  const build =
    questionType === 'champion'
      ? buildChampionQuestion
      : questionRegistry[questionType].build;
  const question = build(context);
  if (!question) return undefined;

  const generation = context.catalog.pokemon[question.pokemonName]?.generation;
  if (!generation) return undefined;

  return {
    ...addQuestionVisuals(context, question),
    generation,
    questionType,
  };
};
