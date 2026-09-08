import { isDailyDate } from './validation';
import { site } from '../app/site';
import { defaultModifiers, getExperienceSettings } from './modifiers';
import {
  generations,
  type Modifiers,
  type ExperienceSettings,
  type QuestionData,
} from './types';
import { coreQuestionTypes } from './questions/definitions';
import { createSeededRandom, pick } from './random';

export const DAILY_CHALLENGE_VERSION = 11;
export const DAILY_QUESTION_COUNT = 5;
const DAILY_STANDARD_QUESTION_COUNT = DAILY_QUESTION_COUNT - 1;
export const getLocalDate = (date = new Date()): string =>
  [date.getFullYear(), date.getMonth() + 1, date.getDate()]
    .map((part, index) => part.toString().padStart(index === 0 ? 4 : 2, '0'))
    .join('-');

export const parseDailyDate = (search: string): string | null => {
  const value = new URLSearchParams(search).get('daily');
  return isDailyDate(value) ? value : null;
};

export const shouldAutoStartDaily = (search: string): boolean =>
  parseDailyDate(search) !== null &&
  new URLSearchParams(search).get('play') === '1';

export const getDailyModifiers = (
  experience: ExperienceSettings,
): Modifiers => ({
  ...defaultModifiers,
  ...getExperienceSettings(experience),
  generations: [...generations],
  questionTypes: [...coreQuestionTypes],
});

export const getDailyQuestionTypes = (
  date: string,
): QuestionData['questionType'][] => {
  const random = createSeededRandom(
    `quizmon-daily-question-types-v${DAILY_CHALLENGE_VERSION}:${date}`,
  );
  const standard = Array.from(
    { length: DAILY_STANDARD_QUESTION_COUNT },
    () => pick(coreQuestionTypes, random) ?? 'pokedex-scan',
  );

  return [...standard, 'champion'];
};

export const getDailyUrl = (date: string): string => {
  const url = new URL(site.url);
  url.searchParams.set('daily', date);
  url.searchParams.set('play', '1');
  return url.toString();
};
