import { attackMultiplier } from '../../pokemon/type-effectiveness';
import {
  QUESTION_RULES_VERSION,
  type VariantRules,
} from '../question-variants';
import type { Difficulty } from '../difficulty';
import type { QuestionContext, QuestionDraft } from './context';

export const applyQuestionVariant = (
  draft: QuestionDraft,
  context: QuestionContext,
  rules: VariantRules,
  level: Difficulty,
): QuestionDraft => {
  const question = {
    ...draft,
    variantLevel: level,
    rulesVersion: QUESTION_RULES_VERSION,
    namesOnly: rules.namesOnly,
    showTypes: rules.showTypes,
  };
  if (rules.namesOnly) {
    question.media = { kind: 'none' };
    question.optionDexNumbers = undefined;
    question.concealOptionLabels = false;
  }
  if (question.media.kind === 'pixel-peek' && rules.cropScale) {
    question.media = {
      ...question.media,
      zoom: (question.media.zoom ?? 1) * rules.cropScale,
    };
  }
  if (rules.shinyReference && question.optionVisuals) {
    question.optionVisuals = Object.fromEntries(
      Object.entries(question.optionVisuals).map(([name, visual]) => [
        name,
        {
          ...visual,
          referenceSrc: context.catalog.pokemon[name]?.sprite ?? undefined,
        },
      ]),
    );
  }
  if (rules.search) {
    question.answer = { ...question.answer, interaction: 'search' };
    question.optionVisuals = undefined;
    question.optionDexNumbers = undefined;
    question.searchOptions = context.pool
      .filter(
        ({ pokemon, name }) =>
          context.questionType !== 'field-notes' ||
          (pokemon.description &&
            pokemon.hasDistinctDescription &&
            (name === question.pokemonName ||
              pokemon.speciesName !==
                context.catalog.pokemon[question.pokemonName]?.speciesName)),
      )
      .map(({ name, pokemon }) => ({ name, dexNumber: pokemon.speciesId }));
  }
  if (rules.typeGrid) {
    question.options = Object.keys(context.catalog.typeRelations);
    question.answer = {
      interaction: 'multi-select',
      correctOptions:
        context.questionType === 'type-check'
          ? question.pokemonTypes
          : question.options.filter(
              (type) =>
                question.visual?.kind === 'type-matchup' &&
                attackMultiplier(
                  context.catalog,
                  type,
                  question.pokemonTypes,
                ) === question.visual.multiplier,
            ),
    };
    if (question.prompt.kind === 'pokemon')
      question.prompt = {
        ...question.prompt,
        before:
          context.questionType === 'type-check'
            ? 'Select every type of '
            : question.prompt.before.replace(
                'Which type has',
                'Select every type with',
              ),
        after: '.',
      };
  }
  if (rules.finale) {
    const { opening, assistance, penalty } = rules.finale;
    question.initialClues = penalty;
    question.assistanceAllowed = assistance;
    question.answer = {
      ...question.answer,
      interaction: opening.startsWith('search') ? 'search' : 'single-choice',
    };
    const genusClue = question.clues?.[0];
    question.suppliedClues =
      typeof genusClue === 'string' &&
      (opening === 'choices-types' || opening === 'search-genus')
        ? [genusClue]
        : [];
    question.showTypes = opening === 'choices-types';
    if (opening === 'search-genus') question.clues = question.clues?.slice(1);
  }
  return question;
};
