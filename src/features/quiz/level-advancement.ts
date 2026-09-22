import type { Difficulty } from '@/domain/quiz/difficulty';
import type { GameResult } from '@/domain/quiz/types';
import {
  readStoredValue,
  writeStoredValue,
} from '@/lib/storage/browser-storage';

const offerKey = (level: Difficulty) =>
  `quizmon.baseline.level-advancement-offered-${level}`;

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

export const wasLevelAdvancementOffered = (level: Difficulty) =>
  readStoredValue('localStorage', offerKey(level)) === 'true';

export const markLevelAdvancementOffered = (level: Difficulty) =>
  writeStoredValue('localStorage', offerKey(level), 'true');
