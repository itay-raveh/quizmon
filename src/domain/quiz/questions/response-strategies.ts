import { attackMultiplier } from '../../pokemon/type-effectiveness.ts';
import type { Difficulty } from '../difficulty.ts';
import type { QuestionContext, QuestionDraft } from './context.ts';
import type { FamilyRules } from './family-rules.ts';

export type ResponseStrategy =
  | { kind: 'choices'; minimumOptions: 2 | 4 }
  | {
      kind: 'search';
      candidates: 'pool' | 'provided';
    }
  | { kind: 'type-grid'; correct: 'subject-types' | 'effectiveness' };

export const applyResponseStrategy = (
  draft: QuestionDraft,
  context: QuestionContext,
  rules: FamilyRules[keyof FamilyRules],
  level?: Difficulty,
): QuestionDraft => {
  const question: QuestionDraft = {
    ...draft,
    ...(level === undefined
      ? {}
      : { variantLevel: level, rulesVersion: context.catalog.contentVersion }),
    rendering: rules.rendering,
    view: draft.optionImages
      ? { ...rules.view, answer: { kind: 'item' } }
      : rules.view,
    showTypes: 'showTypes' in rules ? rules.showTypes : undefined,
  };
  if (question.media.kind === 'pixel-peek' && 'cropScale' in rules) {
    question.media = {
      ...question.media,
      zoom: (question.media.zoom ?? 1) * rules.cropScale,
    };
  }
  const response = rules.response;
  if (response.kind === 'search') {
    question.answer = { ...question.answer, interaction: 'search' };
    question.optionVisuals = undefined;
    question.optionDexNumbers = undefined;
    if (response.candidates === 'pool')
      question.searchOptions = context.pool.map(({ name, pokemon }) => ({
        name,
        dexNumber: pokemon.speciesId,
        sprite: pokemon.sprite,
      }));
  }
  if (rules.response.kind === 'type-grid') {
    question.options = Object.keys(context.catalog.typeRelations);
    question.answer = {
      interaction: 'multi-select',
      correctOptions:
        rules.response.correct === 'subject-types'
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
          rules.response.correct === 'subject-types'
            ? 'Select every type of '
            : question.prompt.before.replace(
                'Which type has',
                'Select every type with',
              ),
        after: '.',
      };
  }
  if ('finale' in rules && rules.finale) {
    const { opening, assistance, penalty } = rules.finale;
    question.initialClues = penalty;
    question.assistanceAllowed = assistance;
    question.answer = {
      ...question.answer,
      interaction: opening === 'search' ? 'search' : 'single-choice',
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
