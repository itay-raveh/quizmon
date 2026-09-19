import type { AnswerResult, GameResult } from '../../src/domain/quiz/types';
export const correctAnswer: AnswerResult = {
  category: 'identity',
  cluesUsed: 0,
  correct: true,
  points: 1000,
  questionType: 'pokedex-scan',
  subject: {
    kind: 'pokemon' as const,
    generation: 'I',
    name: 'pikachu',
  },
};
export const result: GameResult = {
  answers: [
    correctAnswer,
    {
      category: 'stat',
      cluesUsed: 0,
      correct: false,
      points: 0,
      questionType: 'stat-showdown',
      subject: {
        kind: 'pokemon' as const,
        generation: 'II',
        name: 'sudowoodo',
      },
    },
  ],
  contentVersion: 2,
  correctCount: 1,
  elapsedSeconds: 20,
  questionCount: 2,
  score: 1500,
  scoreVersion: 3,
};
