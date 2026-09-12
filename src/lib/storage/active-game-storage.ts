import { generations, type PokemonCatalog } from '../../domain/pokemon/types';
import {
  isQuestionData,
  type QuestionLineup,
} from '../../domain/quiz/question-lineup';
import { getQuestionPokemon } from '../../domain/quiz/question-pokemon';
import { questionTypes } from '../../domain/quiz/questions/definitions';
import {
  questionCategories,
  type AnswerResult,
  type GameMode,
  type QuestionData,
} from '../../domain/quiz/types';
import { normalizeGameSettings } from '../../domain/settings/game-settings';
import {
  getDailyResultKey,
  isDailyTrack,
  type DailyTrack,
} from '../../domain/quiz/daily-track';
import { trainingModes, type GameSettings } from '../../domain/settings/types';
import {
  isChoice,
  isDailyDate,
  isFiniteNonnegative,
  isNonemptyChoiceArray,
  isNonnegativeInteger,
  isRecord,
} from '../validation';
import {
  readStoredJson,
  removeStoredValue,
  writeStoredJson,
} from './browser-storage';
import { readPlayerSave } from './player-storage';

const ACTIVE_GAME_KEY = 'quizmon.active-game.v1';
const ACTIVE_GAME_VERSION = 2;
const DAILY_ATTEMPTS_KEY = 'quizmon.daily-attempts.v1';
export interface ActiveGameSnapshot extends QuestionLineup {
  roundId?: string;
  answers: AnswerResult[];
  elapsedMilliseconds: number;
  mode: GameMode;
  settings: GameSettings;
  questionCount: number;
  playerRestoreId?: string | null;
  version: number;
}

const parseMode = (value: unknown): GameMode | null => {
  if (!isRecord(value)) return null;
  if (value.kind === 'training') return { kind: 'training' };
  if (value.kind === 'league') return { kind: 'league' };
  if (value.kind === 'daily' && isDailyDate(value.date)) {
    if (value.track !== undefined && !isDailyTrack(value.track)) return null;
    return {
      kind: 'daily',
      date: value.date,
      ...(value.track === undefined ? {} : { track: value.track }),
    };
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
    ...(typeof value.unassistedSearch === 'boolean'
      ? { unassistedSearch: value.unassistedSearch }
      : {}),
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

const parseGameSettings = (value: unknown): GameSettings | null => {
  if (
    !isRecord(value) ||
    !isNonemptyChoiceArray(value.generations, generations) ||
    !isNonemptyChoiceArray(value.questionTypes, questionTypes) ||
    !isChoice(value.trainingMode, trainingModes)
  ) {
    return null;
  }

  const settings = normalizeGameSettings(value);
  if (value.difficulty === undefined) {
    delete settings.difficulty;
    delete settings.questionSelection;
  }
  return settings;
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
    value.answers.length > value.questionCount ||
    !Array.isArray(value.questions) ||
    value.questions.length !== value.questionCount ||
    !value.questions.every(isQuestionData) ||
    (value.roundId !== undefined &&
      (typeof value.roundId !== 'string' ||
        value.roundId.length > 200 ||
        !value.roundId))
  ) {
    return null;
  }

  const mode = parseMode(value.mode);
  const settings = parseGameSettings(value.modifiers ?? value.settings);
  const answers = value.answers.map(parseAnswer);
  if (!mode || !settings || !answers.every((answer) => answer !== null))
    return null;

  return {
    questions: value.questions,
    ...(value.roundId === undefined ? {} : { roundId: value.roundId }),
    answers,
    contentVersion: value.contentVersion,
    elapsedMilliseconds: value.elapsedMilliseconds,
    mode,
    settings,
    questionCount: value.questionCount,
    playerRestoreId:
      typeof value.playerRestoreId === 'string' ? value.playerRestoreId : null,
    seed: value.seed,
    version: value.version,
  };
};

export const hasActiveGame = (): boolean =>
  readStoredJson('sessionStorage', ACTIVE_GAME_KEY) !== null;

const normalizeQuestionPokemon = (
  question: QuestionData,
  catalog: PokemonCatalog,
): boolean => {
  const { prompt, visual, optionDexNumbers } = question;
  const namedPokemon = [
    ...(question.searchOptions ?? []),
    ...(prompt.kind === 'pokemon' ? [prompt] : []),
    ...(visual?.kind === 'evolution-shift' ? [visual.evolution] : []),
  ];
  const numberedPokemon = [
    ...namedPokemon.map((pokemon) => [pokemon.name, pokemon] as const),
    ...Object.entries(question.optionVisuals ?? {}),
    ...(visual?.kind === 'evolution-link' ? Object.entries(visual.stages) : []),
  ];
  const names = [
    ...getQuestionPokemon(question, true),
    ...question.repetition.subjects,
    ...question.repetition.primary,
    ...question.repetition.distractors,
    ...numberedPokemon.map(([name]) => name),
    ...Object.keys(optionDexNumbers ?? {}),
  ];
  if (names.some((name) => !Object.hasOwn(catalog.pokemon, name))) return false;

  // The snapshot is freshly parsed, so normalization cannot mutate live state.
  for (const [name, pokemon] of numberedPokemon)
    pokemon.dexNumber = catalog.pokemon[name]!.speciesId;
  if (optionDexNumbers)
    for (const name of Object.keys(optionDexNumbers))
      optionDexNumbers[name] = catalog.pokemon[name]!.speciesId;
  return true;
};

export const readActiveGame = (
  catalog: PokemonCatalog,
): ActiveGameSnapshot | null => {
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
  if (
    !snapshot ||
    !snapshot.questions.every((question) =>
      normalizeQuestionPokemon(question, catalog),
    ) ||
    !snapshot.answers.every((answer, index) => {
      const question = snapshot.questions[index];
      return (
        answer.category === question?.category &&
        answer.generation === question.generation &&
        answer.questionType === question.questionType &&
        answer.pokemonName === question.pokemonName
      );
    })
  ) {
    clearActiveGame();
    return null;
  }
  return snapshot;
};

export const writeActiveGame = (
  snapshot: Omit<ActiveGameSnapshot, 'version'>,
): boolean => {
  try {
    const playerRestoreId = readPlayerSave().restoreId;
    if (
      snapshot.playerRestoreId !== undefined &&
      snapshot.playerRestoreId !== playerRestoreId
    )
      return false;
    const { settings, ...round } = snapshot;
    const value = {
      ...round,
      modifiers: settings,
      playerRestoreId,
      version: ACTIVE_GAME_VERSION,
    };
    const activeSaved = writeStoredJson(
      'sessionStorage',
      ACTIVE_GAME_KEY,
      value,
    );
    if (snapshot.mode.kind === 'daily' && snapshot.mode.track) {
      const stored = readStoredJson('localStorage', DAILY_ATTEMPTS_KEY);
      const attempts = isRecord(stored) ? stored : {};
      attempts[getDailyResultKey(snapshot.mode.date, snapshot.mode.track)] =
        value;
      return (
        writeStoredJson('localStorage', DAILY_ATTEMPTS_KEY, attempts) &&
        activeSaved
      );
    }
    return activeSaved;
  } catch {
    return false;
  }
};

export const clearActiveGame = (): void => {
  removeStoredValue('sessionStorage', ACTIVE_GAME_KEY);
};

export const readDailyAttempts = (
  date: string,
  restoreId: string | null,
): Record<string, ActiveGameSnapshot> => {
  const stored = readStoredJson('localStorage', DAILY_ATTEMPTS_KEY);
  if (!isRecord(stored)) return {};
  const attempts: Record<string, ActiveGameSnapshot> = {};
  for (const [key, value] of Object.entries(stored)) {
    if (!key.startsWith(`${date}:`)) continue;
    const snapshot = parseSnapshot(value);
    if (
      snapshot?.mode.kind === 'daily' &&
      snapshot.mode.track &&
      snapshot.mode.date === date &&
      snapshot.playerRestoreId === restoreId &&
      getDailyResultKey(date, snapshot.mode.track) === key
    )
      attempts[key] = snapshot;
  }
  return attempts;
};

export const clearDailyAttempt = (date: string, track: DailyTrack): void => {
  const attempts = readStoredJson('localStorage', DAILY_ATTEMPTS_KEY);
  if (!isRecord(attempts)) return;
  delete attempts[getDailyResultKey(date, track)];
  writeStoredJson('localStorage', DAILY_ATTEMPTS_KEY, attempts);
};
