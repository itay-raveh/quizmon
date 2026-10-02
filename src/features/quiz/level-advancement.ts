import type { Level } from '@/domain/quiz/level';
import type { GameResult } from '@/domain/quiz/types';
import { readStoredJson, writeStoredJson } from '@/lib/storage/browser-storage';
import { z } from 'zod';

const backoffSchema = z.object({
  delay: z.union([z.literal(1), z.literal(2), z.literal(4)]),
  remaining: z.int().min(0).max(5),
  lastRoundSeed: z.string(),
});

const backoffKey = (level: Level) =>
  `quizmon.baseline.level-advancement-backoff-${level}`;

const readBackoff = (level: Level) =>
  backoffSchema.safeParse(readStoredJson('localStorage', backoffKey(level)))
    .data;

export const markStayedAtLevel = (level: Level, roundSeed: string) => {
  const backoff = readBackoff(level);
  if (backoff?.lastRoundSeed === roundSeed && backoff.remaining > 0) return;
  const delay = backoff?.delay === 1 ? 2 : backoff ? 4 : 1;
  writeStoredJson('localStorage', backoffKey(level), {
    delay,
    remaining: delay + 1,
    lastRoundSeed: roundSeed,
  });
};

export const recordCompletedTrainingRound = (
  level: Level,
  roundSeed: string,
) => {
  const backoff = readBackoff(level);
  if (
    !backoff ||
    backoff.remaining === 0 ||
    backoff.lastRoundSeed === roundSeed
  )
    return;
  writeStoredJson('localStorage', backoffKey(level), {
    ...backoff,
    remaining: backoff.remaining - 1,
    lastRoundSeed: roundSeed,
  });
};

export const suggestedLevel = (
  result: GameResult,
  currentLevel: Level | undefined,
): Level | null => {
  const level = result.rules?.level;
  if (
    !level ||
    level === 5 ||
    level !== currentLevel ||
    result.questionCount !== 10 ||
    result.correctCount !== result.questionCount ||
    (readBackoff(level)?.remaining ?? 0) > 0
  )
    return null;
  return (level + 1) as Level;
};
