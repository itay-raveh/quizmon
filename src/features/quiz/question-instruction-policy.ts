import type { QuestionData } from '@/domain/quiz/types';

export const usesVisualInstruction = (question: QuestionData): boolean =>
  !(
    question.prompt.kind === 'pokemon' &&
    question.media.kind === 'none' &&
    !(
      question.visual &&
      ['evolutionGainedType', 'evolution-endpoints', 'evolutionChain'].includes(
        question.visual.kind,
      )
    )
  ) &&
  (Boolean(question.visual) ||
    ['evYields', 'hiddenAbilities'].includes(question.questionType) ||
    (question.questionType === 'natureEffects' &&
      Boolean(question.optionReveals?.[question.answer.correctOptions[0]!])) ||
    question.questionType === 'pokemonAbilities' ||
    question.questionType === 'levelUpMoves');
