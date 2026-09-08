import { formatDailyDate } from './format';
import { isDailyDate } from './validation';
import { site } from '../app/site';
import {
  buildQuestionSequence,
  defaultModifiers,
  getExperienceSettings,
} from './game';
import {
  generations,
  type GameMode,
  type Modifiers,
  type ExperienceSettings,
  type PokemonCatalog,
  type QuestionData,
} from './types';
import { coreQuestionTypes } from './questions/registry';
import { createSeededRandom } from './random';

const DAILY_CHALLENGE_VERSION = 11;
const DAILY_QUESTION_COUNT = 5;
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
  const standard = Array.from({ length: DAILY_STANDARD_QUESTION_COUNT }, () => {
    const index = Math.floor(random() * coreQuestionTypes.length);
    return coreQuestionTypes[index] ?? 'pokedex-scan';
  });

  return [...standard, 'champion'];
};

export const buildDailyQuestions = (
  catalog: PokemonCatalog,
  date: string,
): QuestionData[] => {
  const questions = buildQuestionSequence(
    catalog,
    getDailyQuestionTypes(date),
    getDailyModifiers(defaultModifiers),
    createSeededRandom(`quizmon-daily-v${DAILY_CHALLENGE_VERSION}:${date}`),
  );

  if (questions.length !== DAILY_QUESTION_COUNT) {
    throw new Error('Daily Challenge must contain exactly five questions');
  }

  return questions;
};

export const getModeLabel = (mode: GameMode): string =>
  mode.kind === 'daily'
    ? `Daily Challenge · ${formatDailyDate(mode.date)}`
    : mode.kind === 'league'
      ? 'Quizmon League'
      : 'Training';

export const getDailyUrl = (date: string): string => {
  const url = new URL(site.url);
  url.searchParams.set('daily', date);
  url.searchParams.set('play', '1');
  return url.toString();
};
