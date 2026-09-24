import { readStoredJson, writeStoredJson } from '@/lib/storage/browser-storage';
import { z } from 'zod';

const PROMPT_KEY = 'quizmon.baseline.daily-reminder-prompt';
const PROMPT_AGAIN_AFTER_DAILIES = 3;
const promptHistorySchema = z.object({ completedDailyCount: z.int().min(0) });

const readPromptHistory = (): number | null => {
  const parsed = promptHistorySchema.safeParse(
    readStoredJson('localStorage', PROMPT_KEY),
  );
  return parsed.success ? parsed.data.completedDailyCount : null;
};

export const shouldOfferDailyReminder = (
  completedDailyCount: number,
): boolean => {
  if (completedDailyCount < 1) return false;

  const history = readPromptHistory();
  return (
    history === null ||
    completedDailyCount >= history + PROMPT_AGAIN_AFTER_DAILIES
  );
};

export const markDailyReminderOffered = (completedDailyCount: number) =>
  writeStoredJson('localStorage', PROMPT_KEY, {
    completedDailyCount,
  });
