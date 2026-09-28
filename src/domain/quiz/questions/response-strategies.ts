import { attackMultiplier } from '../../pokemon/type-effectiveness.ts';
import { choosePokemonSprite } from './assembly.ts';
import type { QuestionContext, QuestionDraft } from './context.ts';
import type { FamilyRules } from './family-rules.ts';

/** Presentation and selection are independent response controls. */
export type ResponseStrategy =
  | {
      kind: 'picker';
      /** `adaptive` keeps the mode chosen by a family-specific prompt or finale. */
      selection: 'single' | 'multi' | 'adaptive';
      /** Four requires exactly four choices; two accepts any count of at least two. */
      minimumOptions: 2 | 4;
    }
  | {
      kind: 'search';
      selection: 'single';
      /** Search either the eligible Pokémon pool or builder-supplied entries. */
      candidates: 'pool' | 'provided';
    }
  | {
      kind: 'search';
      selection: 'multi';
      candidates: 'types';
      /** Select the subject's types or every type with the asked multiplier. */
      correct: 'subject-types' | 'effectiveness';
    };

/** Apply the response interaction and its candidate set to a generated question. */
export const applyResponseStrategy = (
  question: QuestionDraft,
  context: QuestionContext,
  rules: FamilyRules[keyof FamilyRules],
): void => {
  const response = rules.response;
  if (response.kind === 'picker' && response.selection !== 'adaptive')
    question.answer = {
      ...question.answer,
      interaction:
        response.selection === 'single' ? 'single-choice' : 'multi-select',
    };
  if (response.kind === 'search' && response.selection === 'single') {
    question.answer = { ...question.answer, interaction: 'search' };
    question.optionVisuals = undefined;
    question.optionDexNumbers = undefined;
    if (response.candidates === 'pool')
      question.searchOptions = context.pool.map(({ name, pokemon }) => ({
        name,
        dexNumber: pokemon.speciesId,
        sprite: choosePokemonSprite(
          pokemon,
          rules.rendering.search.sprite?.source ?? 'front',
          context.random,
        ),
        types: pokemon.types,
      }));
  }
  if (response.kind === 'search' && response.selection === 'multi') {
    question.options = Object.keys(context.catalog.typeRelations);
    question.answer = {
      interaction: 'multi-select',
      correctOptions:
        response.correct === 'subject-types'
          ? (question.subject.types ?? [])
          : question.options.filter(
              (type) =>
                question.visual?.kind === 'typeMatchup' &&
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
          response.correct === 'subject-types'
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
  }
};
