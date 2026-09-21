import type { QuestionData } from './types';

export const usesSearchAnswer = (question: QuestionData): boolean =>
  question.answer.interaction === 'search';

export const showsSearchResponse = (
  question: QuestionData,
  cluesShown: number,
): boolean =>
  usesSearchAnswer(question) &&
  (question.category !== 'champion' || cluesShown === 0) &&
  Boolean(question.searchOptions);
