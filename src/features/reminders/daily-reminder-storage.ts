import { readStoredJson, writeStoredJson } from '@/lib/storage/browser-storage';
import { isNonnegativeInteger, isObject } from '@/lib/validation';

const PROMPT_KEY = 'quizmon.daily-reminder-prompt.v1';
const PROMPT_AGAIN_AFTER_DAILIES = 3;

interface PromptHistory {
  completedDailyCount: number;
  version: 1;
}

const readPromptHistory = (): PromptHistory | null => {
  const candidate = readStoredJson('localStorage', PROMPT_KEY);
  if (!isObject(candidate)) return null;

  return candidate.version === 1 &&
    isNonnegativeInteger(candidate.completedDailyCount)
    ? {
        completedDailyCount: candidate.completedDailyCount,
        version: 1,
      }
    : null;
};

export const shouldOfferDailyReminder = (
  completedDailyCount: number,
): boolean => {
  if (completedDailyCount < 1) return false;

  const history = readPromptHistory();
  return (
    history === null ||
    completedDailyCount >=
      history.completedDailyCount + PROMPT_AGAIN_AFTER_DAILIES
  );
};

export const markDailyReminderOffered = (completedDailyCount: number) =>
  writeStoredJson('localStorage', PROMPT_KEY, {
    completedDailyCount,
    version: 1,
  } satisfies PromptHistory);
