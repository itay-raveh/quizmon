import { readStoredJson, writeStoredJson } from '@/game/browser-storage';

const PROMPT_KEY = 'quizmon.daily-reminder-prompt.v1';
const PROMPT_AGAIN_AFTER_DAILIES = 3;

interface PromptHistory {
  completedDailyCount: number;
  version: 1;
}

const readPromptHistory = (): PromptHistory | null => {
  const value = readStoredJson('localStorage', PROMPT_KEY);
  if (!value || typeof value !== 'object') return null;

  const candidate = value as Partial<PromptHistory>;
  return candidate.version === 1 &&
    Number.isInteger(candidate.completedDailyCount) &&
    (candidate.completedDailyCount ?? -1) >= 0
    ? {
        completedDailyCount: candidate.completedDailyCount as number,
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
