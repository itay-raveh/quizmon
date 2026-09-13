import type { QuestionRendering } from '../question-rendering';
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
  rules: VariantRules & { rendering: QuestionRendering },
  level: Difficulty,
): QuestionDraft => {
  const question = {
    ...draft,
    variantLevel: level,
    rulesVersion: QUESTION_RULES_VERSION,
    rendering: rules.rendering,
    showTypes: rules.showTypes,
  };
  if (question.media.kind === 'pixel-peek' && rules.cropScale) {
    question.media = {
      ...question.media,
      zoom: (question.media.zoom ?? 1) * rules.cropScale,
    };
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
            (name === question.subject.name ||
              pokemon.speciesName !==
                context.catalog.pokemon[question.subject.name]?.speciesName)),
      )
      .map(({ name, pokemon }) => ({
        name,
        dexNumber: pokemon.speciesId,
        sprite: pokemon.sprite,
      }));
  }
  if (rules.typeGrid) {
    question.options = Object.keys(context.catalog.typeRelations);
    question.answer = {
      interaction: 'multi-select',
      correctOptions:
        context.questionType === 'type-check'
          ? (question.subject.types ?? [])
          : question.options.filter(
              (type) =>
                question.visual?.kind === 'type-matchup' &&
                attackMultiplier(
                  context.catalog,
                  type,
                  question.subject.types ?? [],
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
      typeof genusClue === 'string' && opening === 'choices-types'
        ? [genusClue]
        : [];
    question.showTypes = opening === 'choices-types';
  }
  return question;
};
