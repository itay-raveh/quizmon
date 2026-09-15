import {
  parseActiveGameSave,
  type ActiveGameSnapshot,
} from '../../domain/player/active-game';
import { SAVE_SCHEMA_VERSION } from '../../domain/player/player-save';
import { SaveError } from '../../domain/player/save-schema';
import { getSaveIssue, reportSaveIssue } from './save-health';
import type { PokemonCatalog } from '../../domain/pokemon/types';
import { getQuestionPokemon } from '../../domain/quiz/question-pokemon';
import type { QuestionData } from '../../domain/quiz/types';
import {
  getDailyResultKey,
  type DailyTrack,
} from '../../domain/quiz/daily-track';
import { isRecord } from '../validation';
import {
  readStoredJson,
  readStoredValue,
  removeStoredValue,
  writeStoredJson,
} from './browser-storage';
import { readPlayerSave } from './player-storage';
export const ACTIVE_GAME_KEY = 'quizmon.active-game.v1';
export const DAILY_ATTEMPTS_KEY = 'quizmon.daily-attempts.v1';
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
    snapshot = parseActiveGameSave(JSON.parse(raw));
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
      version: SAVE_SCHEMA_VERSION,
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
      snapshot = parseActiveGameSave(value);
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

export const inspectRoundStorage = (): void => {
  const raw = window.sessionStorage.getItem(ACTIVE_GAME_KEY);
  if (raw !== null) {
    const snapshot = parseActiveGameSave(JSON.parse(raw));
    if ((snapshot.playerRestoreId ?? null) !== readPlayerSave().restoreId)
      clearActiveGame();
  }
  const daily = window.localStorage.getItem(DAILY_ATTEMPTS_KEY);
  if (daily !== null) {
    const attempts: unknown = JSON.parse(daily);
    if (!isRecord(attempts))
      throw new SaveError('invalid', 'Saved Daily attempts are invalid.');
    for (const [key, value] of Object.entries(attempts)) {
      const snapshot = parseActiveGameSave(value);
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
