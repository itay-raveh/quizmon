import type { QuestionData } from './types';
import { getQuestionRendering } from './question-variants';
import { getQuestionView } from './question-presentation';

export const usesSearchAnswer = (question: QuestionData): boolean =>
  question.answer.interaction === 'search';

export const showsSearchResponse = (
  question: QuestionData,
  cluesShown: number,
): boolean =>
  usesSearchAnswer(question) &&
  (question.category !== 'champion' || cluesShown === 0) &&
  Boolean(question.searchOptions);

export const showsCorrectSearchAnswerInArtwork = (
  question: QuestionData,
): boolean => {
  if (
    !usesSearchAnswer(question) ||
    question.subject.kind !== 'pokemon' ||
    question.answer.correctOptions[0] !== question.subject.name
  )
    return false;
  const view = getQuestionView(question);
  const rendering = getQuestionRendering(question);
  if (question.visual?.kind === 'evolution-chain')
    return rendering.subject.name !== 'never';
  if (question.media.kind === 'pokemon-from-pixel-crop')
    return rendering.related.name !== 'never';
  if (
    question.media.kind !== 'sprite' &&
    view.subject?.portrait !== 'after-answer'
  )
    return false;
  return view.subject?.identity === 'after-answer'
    ? rendering.related.name !== 'never'
    : rendering.subject.name !== 'never';
};
