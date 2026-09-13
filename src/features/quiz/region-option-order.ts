import type { QuestionData } from '@/domain/quiz/types';

const regions = [
  'kanto',
  'johto',
  'hoenn',
  'sinnoh',
  'unova',
  'kalos',
  'alola',
  'galar',
  'paldea',
];

export const orderRegionOptions = (question: QuestionData) => {
  if (question.questionType !== 'name-that-region') return question.options;
  const rank = (region: string) => {
    const index = regions.indexOf(region);
    return index < 0 ? regions.length : index;
  };
  return question.options.toSorted((a, b) => rank(a) - rank(b));
};
