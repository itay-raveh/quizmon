import { isAnswerSubject } from '../../domain/quiz/subject';
import {
  parseVersionedSave,
  SaveError,
  type SaveMigration,
} from '../../domain/player/save-schema';
import { getSaveIssue, reportSaveIssue } from './save-health';
import {
  formGroups,
  generations,
  type PokemonCatalog,
} from '../../domain/pokemon/types';
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
  type ScoreMultipliers,
} from '../../domain/quiz/types';
import { isScoreMultipliers } from '../../domain/quiz/score-multipliers';
import { isDifficulty } from '../../domain/quiz/difficulty';
import {
  getDailyResultKey,
  isDailyTrack,
  type DailyTrack,
} from '../../domain/quiz/daily-track';
import {
  answerFlows,
  timerDisplays,
  trainingModes,
  type GameSettings,
} from '../../domain/settings/types';
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
  readStoredValue,
  removeStoredValue,
  writeStoredJson,
} from './browser-storage';
import { readPlayerSave } from './player-storage';
export const ACTIVE_GAME_KEY = 'quizmon.active-game.v1';
export const ACTIVE_GAME_VERSION = 3;
export const DAILY_ATTEMPTS_KEY = 'quizmon.daily-attempts.v1';
export interface ActiveGameSnapshot extends QuestionLineup {
  scoreMultipliers?: ScoreMultipliers;
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
    !isAnswerSubject(value.subject) ||
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
    points: value.points,
    questionType: value.questionType,
    ...(value.responseMilliseconds === undefined
      ? {}
      : { responseMilliseconds: value.responseMilliseconds }),
    ...(value.speedBonus === undefined ? {} : { speedBonus: value.speedBonus }),
    subject: value.subject,
  };
};
const parseGameSettings = (value: unknown): GameSettings | null => {
  if (
    !isRecord(value) ||
    !isNonemptyChoiceArray(value.generations, generations) ||
    !isNonemptyChoiceArray(value.questionTypes, questionTypes) ||
    !isChoice(value.trainingMode, trainingModes) ||
    !isNonemptyChoiceArray(value.formGroups, formGroups) ||
    !isChoice(value.answerFlow, answerFlows) ||
    !isChoice(value.timerDisplay, timerDisplays) ||
    typeof value.reduceMotion !== 'boolean' ||
    !isFiniteNonnegative(value.soundVolume) ||
    value.soundVolume > 1 ||
    (value.difficulty !== undefined && !isDifficulty(value.difficulty)) ||
    (value.questionSelection !== undefined &&
      value.questionSelection !== 'custom' &&
      value.questionSelection !== 'automatic') ||
    (value.automaticQuestionTypes !== undefined &&
      (!Array.isArray(value.automaticQuestionTypes) ||
        !value.automaticQuestionTypes.every((type) =>
          isChoice(type, questionTypes),
        )))
  ) {
    return null;
  }
  return value as unknown as GameSettings;
};
const parseSnapshot = (value: unknown): ActiveGameSnapshot | null => {
  if (
    !isRecord(value) ||
    value.version !== ACTIVE_GAME_VERSION ||
    (value.scoreMultipliers !== undefined &&
      !isScoreMultipliers(value.scoreMultipliers)) ||
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
  const settings = parseGameSettings(value.settings);
  const answers = value.answers.map(parseAnswer);
  if (!mode || !settings || !answers.every((answer) => answer !== null))
    return null;
  return {
    questions: value.questions,
    ...(value.scoreMultipliers === undefined
      ? {}
      : { scoreMultipliers: value.scoreMultipliers }),
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
    ...(visual?.kind === 'evolution-link' ||
    visual?.kind === 'evolution-endpoints'
      ? Object.entries(visual.stages)
      : []),
  ];
  const names = [
    ...getQuestionPokemon(question, true),
    ...(question.subject.kind === 'pokemon'
      ? question.repetition.subjects
      : []),
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
  const raw = readStoredValue('sessionStorage', ACTIVE_GAME_KEY);
  if (raw === null) return null;
  let snapshot: ActiveGameSnapshot;
  try {
    snapshot = decodeSnapshot(JSON.parse(raw));
  } catch (error) {
    reportSaveIssue(error);
    return null;
  }
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
        answer.subject.kind === question.subject.kind &&
        answer.subject.generation === question.subject.generation &&
        answer.questionType === question.questionType &&
        answer.subject.name === question.subject.name
      );
    })
  ) {
    reportSaveIssue(
      new SaveError(
        'invalid',
        'The unfinished round contains invalid questions or answers.',
      ),
    );
    return null;
  }
  return snapshot;
};
export const writeActiveGame = (
  snapshot: Omit<ActiveGameSnapshot, 'version'>,
): boolean => {
  if (getSaveIssue()) return false;
  try {
    inspectRoundStorage();
    const playerRestoreId = readPlayerSave().restoreId;
    if (
      snapshot.playerRestoreId !== undefined &&
      snapshot.playerRestoreId !== playerRestoreId
    )
      return false;
    const value = {
      ...snapshot,
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
  } catch (error) {
    reportSaveIssue(error);
    return false;
  }
};
export const clearActiveGame = (): void => {
  if (getSaveIssue()) return;
  removeStoredValue('sessionStorage', ACTIVE_GAME_KEY);
};
export const readDailyAttempts = (
  date: string,
  restoreId: string | null,
): Record<string, ActiveGameSnapshot> => {
  let stored: unknown;
  try {
    const raw = window.localStorage.getItem(DAILY_ATTEMPTS_KEY);
    if (raw === null) return {};
    stored = JSON.parse(raw);
    if (!isRecord(stored))
      throw new SaveError('invalid', 'Saved Daily attempts are invalid.');
  } catch (error) {
    reportSaveIssue(error);
    return {};
  }
  const attempts: Record<string, ActiveGameSnapshot> = {};
  for (const [key, value] of Object.entries(stored)) {
    if (!key.startsWith(`${date}:`)) continue;
    let snapshot: ActiveGameSnapshot;
    try {
      snapshot = decodeSnapshot(value);
    } catch (error) {
      reportSaveIssue(error);
      continue;
    }
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
  if (getSaveIssue()) return;
  try {
    inspectRoundStorage();
  } catch (error) {
    reportSaveIssue(error);
    return;
  }
  const attempts = readStoredJson('localStorage', DAILY_ATTEMPTS_KEY);
  if (!isRecord(attempts)) return;
  delete attempts[getDailyResultKey(date, track)];
  writeStoredJson('localStorage', DAILY_ATTEMPTS_KEY, attempts);
};

const snapshotMigrations: Readonly<Record<number, SaveMigration>> = {};
const decodeSnapshot = (value: unknown): ActiveGameSnapshot =>
  parseVersionedSave(
    { version: isRecord(value) ? value.version : undefined, data: value },
    {
      minimumVersion: 3,
      currentVersion: ACTIVE_GAME_VERSION,
      migrations: snapshotMigrations,
      parseCurrent: (data) => {
        const snapshot = parseSnapshot(data);
        if (!snapshot)
          throw new SaveError('invalid', 'The unfinished round is invalid.');
        return snapshot;
      },
    },
  ).data;

export const inspectRoundStorage = (): void => {
  const raw = window.sessionStorage.getItem(ACTIVE_GAME_KEY);
  if (raw !== null) {
    const snapshot = decodeSnapshot(JSON.parse(raw));
    if ((snapshot.playerRestoreId ?? null) !== readPlayerSave().restoreId)
      clearActiveGame();
  }
  const daily = window.localStorage.getItem(DAILY_ATTEMPTS_KEY);
  if (daily !== null) {
    const attempts: unknown = JSON.parse(daily);
    if (!isRecord(attempts))
      throw new SaveError('invalid', 'Saved Daily attempts are invalid.');
    for (const [key, value] of Object.entries(attempts)) {
      const snapshot = decodeSnapshot(value);
      if (
        snapshot.mode.kind !== 'daily' ||
        !snapshot.mode.track ||
        getDailyResultKey(snapshot.mode.date, snapshot.mode.track) !== key
      )
        throw new SaveError(
          'invalid',
          'A saved Daily attempt has an invalid date or track.',
        );
    }
  }
};
