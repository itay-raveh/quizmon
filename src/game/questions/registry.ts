import {
  getPokemonRecency,
  getQuestionRecency,
  questionRepeatPolicy,
  rememberQuestion,
} from '../question-history';
import type { QuestionData } from '../types';
import { getSpeciesHistory, speciesQuestion } from './species-history';
import { pokemonWeight } from './sampling';
import { buildCounterPickQuestion, buildMatchupQuestion } from './battle';
import { buildChampionQuestion } from './champion';
import { type QuestionBuilder, type QuestionContext } from './context';
import {
  buildPixelPeekQuestion,
  buildPokedexScanQuestion,
  buildShinySpotterQuestion,
  buildSilhouetteMatchQuestion,
  buildSpriteMatchQuestion,
  buildWhosThatPokemonQuestion,
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
  buildEvolutionLinkQuestion,
  buildGenerationRoundupQuestion,
} from './lineage';
import {
  buildLegendHuntQuestion,
  buildTypeTwinsQuestion,
} from './twins-and-legends';

const questionBuilders = {
  'pokedex-scan': buildPokedexScanQuestion,
  'silhouette-match': buildSilhouetteMatchQuestion,
  'sprite-match': buildSpriteMatchQuestion,
  'whos-that-pokemon': buildWhosThatPokemonQuestion,
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
  champion: buildChampionQuestion,
} satisfies Record<QuestionData['questionType'], QuestionBuilder>;

export const buildQuestionType = (
  context: QuestionContext,
  questionType: QuestionData['questionType'],
): QuestionData | undefined => {
  const build = questionBuilders[questionType];
  let selected: QuestionData | undefined;
  let selectedRarity: string | undefined;
  const rarity = (question: QuestionData) =>
    [
      ...new Set([
        ...question.repetition.primary,
        ...question.repetition.distractors,
      ]),
    ]
      .map(pokemonWeight)
      .sort((a, b) => a - b)
      .join(',');
  const history = context.history;
  const speciesHistory = getSpeciesHistory(context);
  const score = (question: QuestionData): number => {
    if (!speciesHistory) return 0;
    const { primary, distractors } = speciesQuestion(
      context.catalog,
      question,
    ).repetition;
    return (
      primary.reduce(
        (sum, name) => sum + getPokemonRecency(speciesHistory, name),
        0,
      ) +
      distractors.reduce(
        (sum, name) =>
          sum +
          getPokemonRecency(speciesHistory, name) /
            questionRepeatPolicy.primaryWeight,
        0,
      )
    );
  };
  const compareRecency = (left: QuestionData, right: QuestionData): number =>
    speciesHistory
      ? getQuestionRecency(
          speciesHistory,
          speciesQuestion(context.catalog, left),
        ) -
          getQuestionRecency(
            speciesHistory,
            speciesQuestion(context.catalog, right),
          ) || score(left) - score(right)
      : 0;
  const attempts =
    history && context.rotation === undefined
      ? questionRepeatPolicy.candidateAttempts
      : 1;
  for (let attempt = 0; attempt < attempts; attempt++) {
    const draft = build({
      ...context,
      questionType,
    });
    if (!draft || draft.options.length !== 4) continue;
    const generation = context.catalog.pokemon[draft.pokemonName]?.generation;
    if (!generation) continue;
    const question = {
      ...draft,
      generation,
      questionType,
    };
    const questionRarity = rarity(question);
    // Choosing a less-seen draft must not turn the initial rarity draw into more Megas.
    if (
      !selected ||
      (questionRarity === selectedRarity &&
        compareRecency(question, selected) < 0)
    ) {
      selected = question;
      selectedRarity = questionRarity;
    }
  }
  if (selected) {
    if (history || context.rotation !== undefined) {
      for (const name of selected.repetition.subjects) context.used.add(name);
    }
    context.used.add(selected.pokemonName);
    if (history) context.history = rememberQuestion(history, selected);
  }
  return selected;
};
