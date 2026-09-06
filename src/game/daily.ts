import { site } from '../app/site';
import { buildQuestionSequence, defaultModifiers } from './game';
import {
  generations,
  type GameMode,
  type Modifiers,
  type PokemonCatalog,
  type QuestionData,
  type QuestionType,
} from './types';
import { questionTypes } from './questions/registry';
import { createSeededRandom } from './random';

const DAILY_CHALLENGE_VERSION = 9;
const DAILY_QUESTION_COUNT = 5;
const DAILY_STANDARD_QUESTION_COUNT = DAILY_QUESTION_COUNT - 1;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const dailyDateFormatter = new Intl.DateTimeFormat('en-US', {
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC',
  year: 'numeric',
});

export const getUtcDate = (date = new Date()): string =>
  date.toISOString().slice(0, 10);

export const parseDailyDate = (search: string): string | null => {
  const value = new URLSearchParams(search).get('daily');
  if (!value || !DATE_PATTERN.test(value)) return null;

  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(parsed.valueOf()) || getUtcDate(parsed) !== value
    ? null
    : value;
};

export const shouldAutoStartDaily = (search: string): boolean =>
  parseDailyDate(search) !== null &&
  new URLSearchParams(search).get('play') === '1';

export const formatDailyDate = (date: string): string =>
  dailyDateFormatter.format(new Date(`${date}T00:00:00.000Z`));

export const getDailyModifiers = (
  experience: Pick<
    Modifiers,
    'answerFlow' | 'reduceMotion' | 'soundVolume' | 'timerDisplay'
  >,
): Modifiers => ({
  ...defaultModifiers,
  answerFlow: experience.answerFlow,
  generations: [...generations],
  questionTypes: [...defaultModifiers.questionTypes],
  reduceMotion: experience.reduceMotion,
  soundVolume: experience.soundVolume,
  timerDisplay: experience.timerDisplay,
});

export const getDailyQuestionTypes = (
  date: string,
): (QuestionType | 'champion')[] => {
  const random = createSeededRandom(
    `quizmon-daily-question-types-v${DAILY_CHALLENGE_VERSION}:${date}`,
  );
  const standard = Array.from({ length: DAILY_STANDARD_QUESTION_COUNT }, () => {
    const index = Math.floor(random() * questionTypes.length);
    return questionTypes[index] ?? 'pokedex-scan';
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
