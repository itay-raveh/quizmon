import type { QuestionData } from '@/domain/quiz/types';

export const usesVisualInstruction = (question: QuestionData): boolean =>
  !(
    question.prompt.kind === 'pokemon' &&
    question.media.kind === 'none' &&
    !(
      question.visual &&
      [
        'evolution-gained-type',
        'evolution-endpoints',
        'evolution-chain',
      ].includes(question.visual.kind)
    )
  ) &&
  (Boolean(question.visual) ||
    ['ev-yields', 'hidden-abilities'].includes(question.questionType) ||
    (question.questionType === 'nature-effects' &&
      Boolean(question.optionReveals?.[question.answer.correctOptions[0]!])) ||
    question.questionType === 'pokemon-abilities' ||
    question.questionType === 'level-up-moves');
