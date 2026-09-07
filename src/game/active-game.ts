import { readPlayerSave } from './player-storage';
import {
  readStoredJson,
  removeStoredValue,
  writeStoredJson,
} from './browser-storage';
import { normalizeModifiers } from './game';
import { isDailyDate } from './daily';
import { questionTypes } from './questions/registry';
import type { AnswerResult, GameMode, Modifiers } from './types';
import { generations, questionCategories, trainingModes } from './types';
import {
  isChoice,
  isFiniteNonnegative,
  isNonnegativeInteger,
  isNonemptyChoiceArray,
  isRecord,
} from './validation';

const ACTIVE_GAME_KEY = 'quizmon.active-game.v1';
const ACTIVE_GAME_VERSION = 1;
export interface ActiveGameSnapshot {
  answers: AnswerResult[];
  contentVersion: number;
  elapsedMilliseconds: number;
  mode: GameMode;
  modifiers: Modifiers;
  questionCount: number;
  playerRestoreId?: string | null;
  seed: string;
  version: number;
}

const parseMode = (value: unknown): GameMode | null => {
  if (!isRecord(value)) return null;
  if (value.kind === 'training') return { kind: 'training' };
  if (value.kind === 'league') return { kind: 'league' };
  if (value.kind === 'daily' && isDailyDate(value.date)) {
    return { kind: 'daily', date: value.date };
  }
  return null;
};

const parseAnswer = (value: unknown): AnswerResult | null => {
  if (
    !isRecord(value) ||
    !isChoice(value.category, questionCategories) ||
    !isNonnegativeInteger(value.cluesUsed) ||
    typeof value.correct !== 'boolean' ||
    !isChoice(value.generation, generations) ||
    typeof value.pokemonName !== 'string' ||
    value.pokemonName.length === 0 ||
    !isFiniteNonnegative(value.points) ||
    (value.questionType !== 'champion' &&
      !isChoice(value.questionType, questionTypes)) ||
    (value.responseMilliseconds !== undefined &&
      !isFiniteNonnegative(value.responseMilliseconds)) ||
    (value.speedBonus !== undefined && !isFiniteNonnegative(value.speedBonus))
  ) {
    return null;
  }

  return {
    category: value.category,
    cluesUsed: value.cluesUsed,
    correct: value.correct,
    generation: value.generation,
    pokemonName: value.pokemonName,
    points: value.points,
    questionType: value.questionType,
    ...(value.responseMilliseconds === undefined
      ? {}
      : { responseMilliseconds: value.responseMilliseconds }),
    ...(value.speedBonus === undefined ? {} : { speedBonus: value.speedBonus }),
  };
};

const parseModifiers = (value: unknown): Modifiers | null => {
  if (
    !isRecord(value) ||
    !isNonemptyChoiceArray(value.generations, generations) ||
    !isNonemptyChoiceArray(value.questionTypes, questionTypes) ||
    !isChoice(value.trainingMode, trainingModes)
  ) {
    return null;
  }

  return normalizeModifiers(value);
};

const parseSnapshot = (value: unknown): ActiveGameSnapshot | null => {
  if (
    !isRecord(value) ||
    value.version !== ACTIVE_GAME_VERSION ||
    !isNonnegativeInteger(value.contentVersion) ||
    !isFiniteNonnegative(value.elapsedMilliseconds) ||
    !isNonnegativeInteger(value.questionCount) ||
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
  if (!mode || !modifiers || !answers.every((answer) => answer !== null))
    return null;

  return {
    answers,
    contentVersion: value.contentVersion,
    elapsedMilliseconds: value.elapsedMilliseconds,
    mode,
    modifiers,
    questionCount: value.questionCount,
    playerRestoreId:
      typeof value.playerRestoreId === 'string' ? value.playerRestoreId : null,
    seed: value.seed,
    version: ACTIVE_GAME_VERSION,
  };
};

export const readActiveGame = (): ActiveGameSnapshot | null => {
  const snapshot = parseSnapshot(
    readStoredJson('sessionStorage', ACTIVE_GAME_KEY),
  );
  try {
    if ((snapshot?.playerRestoreId ?? null) !== readPlayerSave().restoreId) {
      clearActiveGame();
      return null;
    }
  } catch {
    return null;
  }
  if (!snapshot) removeStoredValue('sessionStorage', ACTIVE_GAME_KEY);
  return snapshot;
};

export const writeActiveGame = (
  snapshot: Omit<ActiveGameSnapshot, 'version'>,
): void => {
  try {
    const playerRestoreId = readPlayerSave().restoreId;
    if (
      snapshot.playerRestoreId !== undefined &&
      snapshot.playerRestoreId !== playerRestoreId
    )
      return;
    writeStoredJson('sessionStorage', ACTIVE_GAME_KEY, {
      ...snapshot,
      playerRestoreId,
      version: ACTIVE_GAME_VERSION,
    });
  } catch {
    return;
  }
};

export const clearActiveGame = (): void => {
  removeStoredValue('sessionStorage', ACTIVE_GAME_KEY);
};
