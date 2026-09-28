import { supportsUnleveledQuestion, type QuestionType } from './definitions.ts';
import {
  getPokemonRecency,
  getQuestionRecency,
  getSubjectRecency,
  questionRepeatPolicy,
  rememberQuestion,
} from '../question-history.ts';
import {
  getQuestionVariant,
  getUnleveledQuestionRule,
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
import { applyResponseStrategy } from './response-strategies.ts';
import type { FamilyRules } from './family-rules.ts';

const questionBuilders = {
  itemIdentification: buildItemIdentification,
  itemUses: buildEffect,
  weightComparison: buildMeasurement('weight'),
  heightComparison: buildMeasurement('height'),
  moveTypes: buildMove,
  locationRegion: buildRegion,
  moveCategory: buildMove,
  pokedexCategories: buildCategory,
  evolutionConditions: buildEvolution,
  abilityEffects: buildEffect,
  heldItemEffects: buildEffect,
  hiddenAbilities: buildHidden,
  natureEffects: buildNature,
  evYields: buildEvYield,
  encounterLocations: buildEncounter,
  berryFlavors: buildBerry,
  naturalGift: buildBerry,

  pokemonFromHistoricalSprite: buildPokedexScanQuestion,
  silhouetteForPokemon: buildSilhouetteMatchQuestion,
  spriteForPokemon: buildSpriteMatchQuestion,
  pokemonFromSilhouette: buildWhosThatPokemonQuestion,
  pokemonFromPixelCrop: buildPixelPeekQuestion,
  shinyPokemonIdentification: buildShinySpotterQuestion,
  pokedexEntryMatch: buildDescriptionQuestion,
  pokemonTypes: buildTypeQuestion,
  typeOddOneOut: buildOddOneOutQuestion,
  pokemonByType: buildChooseAllTypeQuestion,
  dualTypeMatch: buildTypeTwinsQuestion,
  legendaryMythicalSelection: buildLegendHuntQuestion,
  pokemonByGeneration: buildGenerationRoundupQuestion,
  evolutionChain: buildEvolutionLinkQuestion,
  evolutionGainedType: buildEvolutionShiftQuestion,
  pokemonAbilities: buildPropertyQuestion('ability'),
  levelUpMoves: buildPropertyQuestion('move'),
  statExtremes: buildStatQuestion,
  typeMatchup: buildMatchupQuestion,
  superEffectiveAttacker: buildCounterPickQuestion,
  champion: buildChampionQuestion,
} satisfies { [Type in keyof FamilyRules]: QuestionBuilder<FamilyRules[Type]> };
export const buildQuestionType = (
  context: QuestionContext,
  questionType: QuestionType | 'champion',
): QuestionData | undefined => {
  if (!context.difficulty && !supportsUnleveledQuestion(questionType))
    return undefined;
  const resolved = context.difficulty
    ? getQuestionVariant(questionType, context.difficulty)
    : undefined;
  if (context.difficulty && !resolved) return undefined;
  const activeRules =
    resolved?.variant ??
    (!context.difficulty ? getUnleveledQuestionRule(questionType) : undefined);
  if (!activeRules) return undefined;
  const build = questionBuilders[questionType] as QuestionBuilder<
    FamilyRules[typeof questionType]
  >;
  const rules = activeRules;
  const singleType = Boolean(
    'singleType' in activeRules && activeRules.singleType,
  );
  const variantContext = {
    ...context,
    questionType,
    variant: activeRules,
    pool: singleType
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
      (rules.response.kind === 'choices' &&
        (rules.response.minimumOptions === 4
          ? original.options.length !== 4
          : original.options.length < 2))
    )
      continue;
    const draft = applyResponseStrategy(
      original,
      variantContext,
      rules,
      resolved?.level,
    );

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
