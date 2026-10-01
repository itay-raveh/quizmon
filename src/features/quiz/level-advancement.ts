import type { Difficulty } from '@/domain/quiz/difficulty';
import type { GameResult } from '@/domain/quiz/types';

export const suggestedLevel = (
  result: GameResult,
  currentLevel: Difficulty | undefined,
  resultSaved: boolean,
): Difficulty | null => {
  const level = result.rules?.difficulty;
  if (
    !resultSaved ||
    !level ||
    level === 5 ||
    level !== currentLevel ||
    result.questionCount !== 10 ||
    result.correctCount !== result.questionCount
  )
    return null;
  return (level + 1) as Difficulty;
};
