import { buildQuestionSequence, defaultModifiers } from './game';
import {
  generations,
  type GameMode,
  type Modifiers,
  type PokemonCatalog,
  type QuestionCategory,
  type QuestionData,
} from './types';

const DAILY_CHALLENGE_VERSION = 2;
const DAILY_QUESTION_COUNT = 10;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const DAILY_CATEGORIES: readonly QuestionCategory[] = [
  'identity',
  'cry',
  'description',
  'type',
  'evolution',
  'ability',
  'move',
  'stat',
  'matchup',
  'champion',
];

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

export const formatDailyDate = (date: string): string =>
  new Intl.DateTimeFormat('en-US', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
    year: 'numeric',
  }).format(new Date(`${date}T00:00:00.000Z`));

const hashSeed = (value: string): number => {
  let hash = 2166136261;
  for (const character of value) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

export const createSeededRandom = (seed: string): (() => number) => {
  let state = hashSeed(seed);
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
};

export const getDailyModifiers = (soundEnabled: boolean): Modifiers => ({
  ...defaultModifiers,
  generations: [...generations],
  knowledgeCategories: [...defaultModifiers.knowledgeCategories],
  isLimitActive: true,
  limit: DAILY_QUESTION_COUNT,
  soundEnabled,
});

export const buildDailyQuestions = (
  catalog: PokemonCatalog,
  date: string,
): QuestionData[] =>
  buildQuestionSequence(
    catalog,
    DAILY_CATEGORIES,
    getDailyModifiers(true),
    createSeededRandom(`quizmon-daily-v${DAILY_CHALLENGE_VERSION}:${date}`),
  );

export const getModeLabel = (mode: GameMode): string =>
  mode.kind === 'daily'
    ? `Trainer Trial · ${formatDailyDate(mode.date)}`
    : 'Training';

export const getDailyUrl = (date: string): string => {
  const url = new URL(window.location.href);
  url.search = '';
  url.hash = '';
  url.searchParams.set('daily', date);
  return url.toString();
};
