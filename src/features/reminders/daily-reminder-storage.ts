import { readStoredJson, writeStoredJson } from '@/lib/storage/browser-storage';
import { isNonnegativeInteger, isObject } from '@/lib/validation';

const PROMPT_KEY = 'quizmon.baseline.daily-reminder-prompt';
const PROMPT_AGAIN_AFTER_DAILIES = 3;

const readPromptHistory = (): number | null => {
  const candidate = readStoredJson('localStorage', PROMPT_KEY);
  if (!isObject(candidate)) return null;

  return isNonnegativeInteger(candidate.completedDailyCount)
    ? candidate.completedDailyCount
    : null;
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
