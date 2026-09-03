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
  label: string;
}

export const questionRegistry = {
  'pokedex-scan': {
    build: buildPokedexScanQuestion,
    category: 'identity',
    label: 'Pokédex scan',
  },
  'silhouette-match': {
    build: buildSilhouetteMatchQuestion,
    category: 'identity',
    label: 'Silhouette match',
  },
  'pixel-peek': {
    build: buildPixelPeekQuestion,
    category: 'identity',
    label: 'Pixel peek',
  },
  'shiny-spotter': {
    build: buildShinySpotterQuestion,
    category: 'identity',
    label: 'Shiny spotter',
  },
  'battle-view': {
    build: buildBattleViewQuestion,
    category: 'identity',
    label: 'Battle view',
  },
  'field-notes': {
    build: buildDescriptionQuestion,
    category: 'description',
    label: 'Field notes',
  },
  'type-check': {
    build: buildTypeQuestion,
    category: 'type',
    label: 'Type check',
  },
  'odd-one-out': {
    build: buildOddOneOutQuestion,
    category: 'type',
    label: 'Odd one out',
  },
  'type-roundup': {
    build: buildChooseAllTypeQuestion,
    category: 'type',
    label: 'Type roundup',
  },
  'evolution-shift': {
    build: buildEvolutionShiftQuestion,
    category: 'evolution',
    label: 'Evolution shift',
  },
  'ability-check': {
    build: buildPropertyQuestion('ability'),
    category: 'ability',
    label: 'Ability check',
  },
  'move-check': {
    build: buildPropertyQuestion('move'),
    category: 'move',
    label: 'Move check',
  },
  'stat-showdown': {
    build: buildStatQuestion,
    category: 'stat',
    label: 'Stat showdown',
  },
  'type-matchup': {
    build: buildMatchupQuestion,
    category: 'matchup',
    label: 'Type matchup',
  },
  'counter-pick': {
    build: buildCounterPickQuestion,
    category: 'matchup',
    label: 'Counter pick',
  },
} satisfies Record<QuestionType, QuestionDefinition>;

export const questionTypes = Object.keys(questionRegistry) as QuestionType[];

const championDefinition: QuestionDefinition = {
  build: buildChampionQuestion,
  category: 'champion',
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
