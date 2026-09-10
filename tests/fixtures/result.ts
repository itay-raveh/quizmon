import type { AnswerResult, GameResult } from '@/game/types';

export const correctAnswer: AnswerResult = {
  category: 'identity',
  cluesUsed: 0,
  correct: true,
  generation: 'I',
  pokemonName: 'pikachu',
  points: 1_000,
  questionType: 'pokedex-scan',
};

export const result: GameResult = {
  answers: [
    correctAnswer,
    {
      category: 'stat',
      cluesUsed: 0,
      correct: false,
      generation: 'II',
      pokemonName: 'sudowoodo',
      points: 0,
      questionType: 'stat-showdown',
    },
  ],
  contentVersion: 2,
  correctCount: 1,
  elapsedSeconds: 20,
  questionCount: 2,
  score: 1_500,
  scoreVersion: 2,
};
