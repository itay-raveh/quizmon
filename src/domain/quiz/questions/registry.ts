import { supportsStandardQuestion } from './definitions.ts';
import {
  getPokemonRecency,
  getQuestionRecency,
  getSubjectRecency,
  questionRepeatPolicy,
  rememberQuestion,
} from '../question-history.ts';
import {
  getQuestionVariant,
  resolveQuestionRendering,
} from '../question-variants.ts';
import type { QuestionData } from '../types.ts';
import { buildHidden } from './abilities.ts';
import { buildCounterPickQuestion, buildMatchupQuestion } from './battle.ts';
import { buildBerry } from './berries.ts';
import { buildChampionQuestion } from './champion.ts';
import { type QuestionBuilder, type QuestionContext } from './context.ts';
import { buildEffect } from './effects.ts';
import {
  buildEvolution,
  buildEvolutionLinkQuestion,
  buildEvolutionShiftQuestion,
} from './evolution.ts';
import { buildGenerationRoundupQuestion } from './generations.ts';
import {
  buildPixelPeekQuestion,
  buildPokedexScanQuestion,
  buildShinySpotterQuestion,
  buildSilhouetteMatchQuestion,
  buildSpriteMatchQuestion,
  buildWhosThatPokemonQuestion,
} from './identity.ts';
import { buildItemIdentification } from './items.ts';
import { buildLegendHuntQuestion } from './legendaries.ts';
import { buildEncounter, buildRegion } from './locations.ts';
import { buildMeasurement } from './measurements.ts';
import { buildMove } from './moves.ts';
import { buildCategory, buildDescriptionQuestion } from './pokedex.ts';
import { buildPropertyQuestion } from './properties.ts';
import { pokemonWeight } from './sampling.ts';
import { getSpeciesHistory, speciesQuestion } from './species-history.ts';
import { buildEvYield, buildNature, buildStatQuestion } from './stats.ts';
import {
  buildChooseAllTypeQuestion,
  buildOddOneOutQuestion,
  buildTypeQuestion,
  buildTypeTwinsQuestion,
} from './types.ts';
import { applyQuestionVariant } from './variants.ts';

const questionBuilders = {
  'item-identification': buildItemIdentification,
  'medicine-cabinet': buildEffect,
  'evolution-items': buildEvolution,
  'weight-comparison': buildMeasurement('weight'),
  'height-comparison': buildMeasurement('height'),
  'move-types': buildMove,
  'name-that-region': buildRegion,
  'move-purpose': buildMove,
  'pokedex-categories': buildCategory,
  'evolution-conditions': buildEvolution,
  'ability-effects': buildEffect,
  'held-item-effects': buildEffect,
  'hidden-abilities': buildHidden,
  'nature-effects': buildNature,
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
  if (!context.difficulty && !supportsStandardQuestion(questionType))
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
    question.rendering ??= resolveQuestionRendering(questionType);
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
