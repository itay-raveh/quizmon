import {
  readStoredJson,
  removeStoredValue,
  writeStoredJson,
} from './browser-storage';
import { normalizeModifiers } from './game';
import { parseDailyDate } from './daily';
import { questionTypes } from './questions/registry';
import type {
  AnswerResult,
  GameMode,
  Generation,
  Modifiers,
  QuestionCategory,
  QuestionType,
} from './types';
import { generations, questionCategories } from './types';
import { isFiniteNonnegative, isRecord } from './validation';

const ACTIVE_GAME_KEY = 'quizmon.active-game.v1';
const ACTIVE_GAME_VERSION = 1;
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

const parseMode = (value: unknown): GameMode | null => {
  if (!isRecord(value)) return null;
  if (value.kind === 'training') return { kind: 'training' };
  if (value.kind === 'league') return { kind: 'league' };
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
    typeof value.cluesUsed !== 'number' ||
    !Number.isInteger(value.cluesUsed) ||
    !isFiniteNonnegative(value.cluesUsed) ||
    typeof value.correct !== 'boolean' ||
    typeof value.generation !== 'string' ||
    !generations.includes(value.generation as Generation) ||
    typeof value.pokemonName !== 'string' ||
    value.pokemonName.length === 0 ||
    !isFiniteNonnegative(value.points) ||
    (value.questionType !== 'champion' &&
      (typeof value.questionType !== 'string' ||
        !questionTypes.includes(value.questionType as QuestionType))) ||
    (value.responseMilliseconds !== undefined &&
      !isFiniteNonnegative(value.responseMilliseconds)) ||
    (value.speedBonus !== undefined && !isFiniteNonnegative(value.speedBonus))
  ) {
    return null;
  }

  return {
    category: value.category as QuestionCategory,
    cluesUsed: value.cluesUsed,
    correct: value.correct,
    generation: value.generation as Generation,
    pokemonName: value.pokemonName,
    points: value.points,
    questionType: value.questionType as QuestionType | 'champion',
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
  const snapshot = parseSnapshot(
    readStoredJson('sessionStorage', ACTIVE_GAME_KEY),
  );
  if (!snapshot) removeStoredValue('sessionStorage', ACTIVE_GAME_KEY);
  return snapshot;
};

export const writeActiveGame = (
  snapshot: Omit<ActiveGameSnapshot, 'version'>,
): void => {
  writeStoredJson('sessionStorage', ACTIVE_GAME_KEY, {
    ...snapshot,
    version: ACTIVE_GAME_VERSION,
  });
};

export const clearActiveGame = (): void => {
  removeStoredValue('sessionStorage', ACTIVE_GAME_KEY);
};
