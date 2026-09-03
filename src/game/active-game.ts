import { normalizeModifiers } from './game';
import { parseDailyDate } from './daily';
import { questionTypes } from './questions/registry';
import type {
  AnswerResult,
  GameMode,
  Modifiers,
  QuestionCategory,
} from './types';
import { generations } from './types';

const ACTIVE_GAME_KEY = 'quizmon.active-game.v1';
const ACTIVE_GAME_VERSION = 1;
const questionCategories: readonly QuestionCategory[] = [
  'ability',
  'champion',
  'description',
  'evolution',
  'identity',
  'matchup',
  'move',
  'stat',
  'type',
];

export interface ActiveGameSnapshot {
  answers: AnswerResult[];
  contentVersion: number;
  elapsedMilliseconds: number;
  mode: GameMode;
  modifiers: Modifiers;
  questionCount: number;
  seed: string;
  version: number;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const isFiniteNonnegative = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0;

const parseMode = (value: unknown): GameMode | null => {
  if (!isRecord(value)) return null;
  if (value.kind === 'training') return { kind: 'training' };
  if (
    value.kind === 'daily' &&
    typeof value.date === 'string' &&
    parseDailyDate(`?daily=${value.date}`) === value.date
  ) {
    return { kind: 'daily', date: value.date };
  }
  return null;
};

const parseAnswer = (value: unknown): AnswerResult | null => {
  if (
    !isRecord(value) ||
    typeof value.category !== 'string' ||
    !questionCategories.includes(value.category as QuestionCategory) ||
    typeof value.correct !== 'boolean' ||
    !isFiniteNonnegative(value.points) ||
    (value.responseMilliseconds !== undefined &&
      !isFiniteNonnegative(value.responseMilliseconds)) ||
    (value.speedBonus !== undefined && !isFiniteNonnegative(value.speedBonus))
  ) {
    return null;
  }

  return {
    category: value.category as QuestionCategory,
    correct: value.correct,
    points: value.points,
    ...(value.responseMilliseconds === undefined
      ? {}
      : { responseMilliseconds: value.responseMilliseconds }),
    ...(value.speedBonus === undefined ? {} : { speedBonus: value.speedBonus }),
  };
};

const parseModifiers = (value: unknown): Modifiers | null => {
  if (
    !isRecord(value) ||
    !Array.isArray(value.generations) ||
    value.generations.length === 0 ||
    !value.generations.every(
      (generation) =>
        typeof generation === 'string' &&
        generations.includes(generation as (typeof generations)[number]),
    ) ||
    !Array.isArray(value.questionTypes) ||
    value.questionTypes.length === 0 ||
    !value.questionTypes.every(
      (questionType) =>
        typeof questionType === 'string' &&
        questionTypes.includes(questionType as (typeof questionTypes)[number]),
    ) ||
    typeof value.soundEnabled !== 'boolean' ||
    typeof value.isLimitActive !== 'boolean' ||
    typeof value.limit !== 'number' ||
    !Number.isInteger(value.limit) ||
    value.limit < 1 ||
    typeof value.speedrunMode !== 'boolean'
  ) {
    return null;
  }

  return normalizeModifiers(value);
};

const parseSnapshot = (value: unknown): ActiveGameSnapshot | null => {
  if (
    !isRecord(value) ||
    value.version !== ACTIVE_GAME_VERSION ||
    !Number.isInteger(value.contentVersion) ||
    !isFiniteNonnegative(value.contentVersion) ||
    !isFiniteNonnegative(value.elapsedMilliseconds) ||
    !Number.isInteger(value.questionCount) ||
    !isFiniteNonnegative(value.questionCount) ||
    value.questionCount < 1 ||
    typeof value.seed !== 'string' ||
    value.seed.length === 0 ||
    value.seed.length > 200 ||
    !Array.isArray(value.answers) ||
    value.answers.length > value.questionCount
  ) {
    return null;
  }

  const mode = parseMode(value.mode);
  const modifiers = parseModifiers(value.modifiers);
  const answers = value.answers.map(parseAnswer);
  if (!mode || !modifiers || answers.some((answer) => !answer)) return null;

  return {
    answers: answers as AnswerResult[],
    contentVersion: value.contentVersion,
    elapsedMilliseconds: value.elapsedMilliseconds,
    mode,
    modifiers,
    questionCount: value.questionCount,
    seed: value.seed,
    version: ACTIVE_GAME_VERSION,
  };
};

export const readActiveGame = (): ActiveGameSnapshot | null => {
  try {
    const stored = window.sessionStorage.getItem(ACTIVE_GAME_KEY);
    if (!stored) return null;
    const snapshot = parseSnapshot(JSON.parse(stored));
    if (!snapshot) window.sessionStorage.removeItem(ACTIVE_GAME_KEY);
    return snapshot;
  } catch {
    return null;
  }
};

export const writeActiveGame = (
  snapshot: Omit<ActiveGameSnapshot, 'version'>,
): void => {
  try {
    window.sessionStorage.setItem(
      ACTIVE_GAME_KEY,
      JSON.stringify({ ...snapshot, version: ACTIVE_GAME_VERSION }),
    );
  } catch {
    return;
  }
};

export const clearActiveGame = (): void => {
  try {
    window.sessionStorage.removeItem(ACTIVE_GAME_KEY);
  } catch {
    return;
  }
};
