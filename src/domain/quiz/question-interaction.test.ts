import type { QuestionData } from './types';
import { showsSearchResponse, usesSearchAnswer } from './question-interaction';

const question: QuestionData = {
  answer: { correctOptions: ['pikachu'], interaction: 'search' },
  category: 'champion',
  id: 'champion:pikachu',
  media: { kind: 'none' },
  options: ['pikachu', 'eevee', 'ditto', 'mew'],
  prompt: { kind: 'text', text: 'Who is this Pokémon?' },
  questionType: 'champion',
  repetition: {
    identity: 'pikachu',
    subjects: ['pikachu'],
    primary: ['pikachu'],
    distractors: ['eevee', 'ditto', 'mew'],
  },
  searchOptions: [{ name: 'pikachu', dexNumber: 25 }],
  subject: {
    kind: 'pokemon',
    generation: 'I',
    name: 'pikachu',
    types: ['electric'],
  },
};

it('keeps Champion search and keyboard behavior in sync with the visible response', () => {
  expect(usesSearchAnswer(question)).toBe(true);
  expect(showsSearchResponse(question, 0)).toBe(true);
  expect(showsSearchResponse(question, 1)).toBe(false);
  expect(
    showsSearchResponse({ ...question, searchOptions: undefined }, 0),
  ).toBe(false);
});
