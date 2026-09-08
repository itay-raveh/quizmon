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
import { createSeededRandom, shuffle } from './random';

export const DAILY_CHALLENGE_VERSION = 13;
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

const dailyOrdinal = (date: string): number =>
  Math.floor(Date.parse(`${date}T00:00:00Z`) / 86_400_000);

const dailySlot = (date: string, index: number): number =>
  dailyOrdinal(date) * DAILY_STANDARD_QUESTION_COUNT + index;

export const getDailyQuestionTypes = (
  date: string,
): QuestionData['questionType'][] => [
  ...Array.from({ length: DAILY_STANDARD_QUESTION_COUNT }, (_, index) => {
    const slot = dailySlot(date, index);
    const cycle = Math.floor(slot / coreQuestionTypes.length);
    const deck = shuffle(
      coreQuestionTypes,
      createSeededRandom(`daily-types-v${DAILY_CHALLENGE_VERSION}:${cycle}`),
    );
    return deck[((slot % deck.length) + deck.length) % deck.length]!;
  }),
  'champion',
];

export const getDailyRotation = (date: string): number[] => [
  ...Array.from({ length: DAILY_STANDARD_QUESTION_COUNT }, (_, index) =>
    Math.floor(dailySlot(date, index) / coreQuestionTypes.length),
  ),
  dailyOrdinal(date),
];

export const getDailyUrl = (date: string): string => {
  const url = new URL(site.url);
  url.searchParams.set('daily', date);
  url.searchParams.set('play', '1');
  return url.toString();
};
