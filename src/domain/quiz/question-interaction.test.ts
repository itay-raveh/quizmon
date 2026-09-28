import type { QuestionData } from './types';
import { baseQuestionRendering } from './question-variants';
import { savedQuestionSchema } from './question-lineup.ts';
import { getQuestionView } from './question-presentation.ts';
import {
  showsCorrectSearchAnswerInArtwork,
  showsSearchResponse,
  usesSearchAnswer,
} from './question-interaction';

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

it('omits duplicate search feedback only when the artwork reveals the answer', () => {
  const scan: QuestionData = {
    ...question,
    category: 'identity',
    media: { kind: 'sprite', src: '/pikachu.png' },
    questionType: 'pokemon-from-historical-sprite',
  };
  expect(showsCorrectSearchAnswerInArtwork(scan)).toBe(true);
  expect(showsCorrectSearchAnswerInArtwork(question)).toBe(false);
  expect(
    showsCorrectSearchAnswerInArtwork({
      ...scan,
      rendering: {
        ...baseQuestionRendering,
        related: { ...baseQuestionRendering.related, name: 'never' },
      },
    }),
  ).toBe(false);
});

it('keeps the answer view in saved rounds and rejects retired question types', () => {
  const view = {
    answer: { kind: 'pokemon' as const, revealTypes: 'after-answer' as const },
  };
  const saved = savedQuestionSchema.parse({ ...question, view });
  expect(saved.view).toEqual(view);
  expect(getQuestionView({ ...question, view })).toEqual(view);
  expect(
    savedQuestionSchema.safeParse({
      ...question,
      questionType: 'retired-question-type',
    }).success,
  ).toBe(false);
});
