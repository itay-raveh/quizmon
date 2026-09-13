import { expansionVariants } from '../question-variants';
import {
  buildMeasurement,
  buildBaby,
  buildCategory,
  buildHidden,
  buildEggGroups,
  buildEvYield,
} from './expansion-pokemon';
import {
  buildNature,
  buildBerry,
  buildRegion,
  buildItemIdentification,
  buildMove,
} from './expansion-topics';
import { buildEvolution } from './expansion-evolution';
import { buildMedicine, buildEffect } from './expansion-effects';
import { buildEncounter } from './expansion-encounters';
import { getQuestionVariant } from '../question-variants';
import { applyQuestionVariant } from './variants';
import {
  getPokemonRecency,
  getSubjectRecency,
  getQuestionRecency,
  questionRepeatPolicy,
  rememberQuestion,
} from '../question-history';
import type { QuestionData } from '../types';
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
import { pokemonWeight } from './sampling';
import { getSpeciesHistory, speciesQuestion } from './species-history';
import {
  buildLegendHuntQuestion,
  buildTypeTwinsQuestion,
} from './twins-and-legends';
const questionBuilders = {
  'item-identification': buildItemIdentification,
  'medicine-cabinet': buildMedicine,
  'evolution-items': buildEvolution,
  'weight-comparison': buildMeasurement('weight'),
  'height-comparison': buildMeasurement('height'),
  'move-types': buildMove,
  'name-that-region': buildRegion,
  'move-purpose': buildMove,
  'baby-pokemon': buildBaby,
  'pokedex-categories': buildCategory,
  'evolution-conditions': buildEvolution,
  'ability-effects': buildEffect,
  'held-item-effects': buildEffect,
  'hidden-abilities': buildHidden,
  'nature-effects': buildNature,
  'egg-group-connections': buildEggGroups,
  'ev-yields': buildEvYield,
  'encounter-locations': buildEncounter,
  'berry-flavors': buildBerry,
  'natural-gift': buildBerry,

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
  if (!context.difficulty && Object.hasOwn(expansionVariants, questionType))
    return undefined;
  const resolved = context.difficulty
    ? getQuestionVariant(questionType, context.difficulty)
    : undefined;
  if (context.difficulty && !resolved) return undefined;
  const build = questionBuilders[questionType];
  const variantContext = {
    ...context,
    questionType,
    variant: resolved?.variant,
    pool: resolved?.variant.singleType
      ? context.pool.filter(({ pokemon }) => pokemon.types.length === 1)
      : context.pool,
  };
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
      (question.subject.kind === 'pokemon'
        ? 0
        : question.repetition.subjects.reduce(
            (sum, subject) =>
              sum +
              getSubjectRecency(speciesHistory, question.questionType, subject),
            0,
          )) +
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
    const original = build(variantContext);
    if (
      !original ||
      (!resolved?.variant.search &&
        !resolved?.variant.fullList &&
        original.options.length !== 4)
    )
      continue;
    const draft = resolved
      ? applyQuestionVariant(
          original,
          variantContext,
          resolved.variant,
          resolved.level,
        )
      : original;

    const question = {
      ...draft,
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
    if (selected.subject.kind === 'pokemon')
      context.used.add(selected.subject.name);
    if (history) context.history = rememberQuestion(history, selected);
  }
  return selected;
};
