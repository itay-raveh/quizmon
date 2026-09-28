import type { QuestionData } from './types';
import { getQuestionRendering } from './question-variants';

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
  const rendering = getQuestionRendering(question);
  if (question.visual?.kind === 'evolutionChain')
    return rendering.subject.name !== 'never';
  if (question.media.kind === 'pokemonFromPixelCrop')
    return rendering.subject.name !== 'never';
  if (
    question.media.kind !== 'sprite' &&
    !(
      question.media.kind === 'none' &&
      rendering.subject.sprite?.reveal === 'after-answer'
    )
  )
    return false;
  return rendering.subject.name !== 'never';
};
