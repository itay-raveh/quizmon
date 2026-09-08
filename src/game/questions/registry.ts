import {
  getQuestionExposure,
  getQuestionRecency,
  getPokemonRecency,
  getQuestionSubjects,
  rememberQuestion,
  questionRepeatPolicy,
} from '../question-history';
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

const questionBuilders = {
  'pokedex-scan': buildPokedexScanQuestion,
  'silhouette-match': buildSilhouetteMatchQuestion,
  'pixel-peek': buildPixelPeekQuestion,
  'shiny-spotter': buildShinySpotterQuestion,
  'field-notes': buildDescriptionQuestion,
  'type-check': buildTypeQuestion,
  'odd-one-out': buildOddOneOutQuestion,
  'type-roundup': buildChooseAllTypeQuestion,
  'type-twins': buildTypeTwinsQuestion,
  'legend-hunt': buildLegendHuntQuestion,
  'generation-roundup': buildGenerationRoundupQuestion,
  'evolution-link': buildEvolutionLinkQuestion,
  'evolution-shift': buildEvolutionShiftQuestion,
  'ability-check': buildPropertyQuestion('ability'),
  'move-check': buildPropertyQuestion('move'),
  'stat-showdown': buildStatQuestion,
  'type-matchup': buildMatchupQuestion,
  'counter-pick': buildCounterPickQuestion,
} satisfies Record<QuestionType, QuestionBuilder>;

export const buildQuestionType = (
  context: QuestionContext,
  questionType: QuestionData['questionType'],
): QuestionData | undefined => {
  const build =
    questionType === 'champion'
      ? buildChampionQuestion
      : questionBuilders[questionType];
  let selected: QuestionData | undefined;
  const history = context.history;
  const score = (question: QuestionData): number => {
    if (!history) return 0;
    const exposure = getQuestionExposure(question);
    return (
      exposure.primary.reduce(
        (sum, name) => sum + getPokemonRecency(history, name),
        0,
      ) +
      exposure.distractors.reduce(
        (sum, name) =>
          sum +
          getPokemonRecency(history, name) / questionRepeatPolicy.primaryWeight,
        0,
      )
    );
  };
  const attempts =
    history && context.rotation === undefined
      ? questionRepeatPolicy.candidateAttempts
      : 1;
  for (let attempt = 0; attempt < attempts; attempt++) {
    const draft = build({
      ...context,
      questionType,
      used: new Set(context.used),
    });
    if (!draft) continue;
    const generation = context.catalog.pokemon[draft.pokemonName]?.generation;
    if (!generation) continue;
    const question = {
      ...addQuestionVisuals(context, draft),
      generation,
      questionType,
    };
    if (
      !selected ||
      (history &&
        (getQuestionRecency(history, question) <
          getQuestionRecency(history, selected) ||
          (getQuestionRecency(history, question) ===
            getQuestionRecency(history, selected) &&
            score(question) < score(selected))))
    )
      selected = question;
  }
  if (selected) {
    if (history || context.rotation !== undefined) {
      for (const name of getQuestionSubjects(selected)) context.used.add(name);
    }
    context.used.add(selected.pokemonName);
    if (history) context.history = rememberQuestion(history, selected);
  }
  return selected;
};
