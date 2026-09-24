import {
  parseActiveGameSave,
  type ActiveGameSnapshot,
} from '../../domain/player/active-game';
export type { ActiveGameSnapshot } from '../../domain/player/active-game';
import { SAVE_SCHEMA_VERSION } from '../../domain/player/player-save';
import { SaveError } from '../../domain/player/save-schema';
import type { PokemonCatalog } from '../../domain/pokemon/types';
import type { QuestionData } from '../../domain/quiz/types';
import { getQuestionPokemon } from '../../domain/quiz/question-pokemon';
import { getDailyResultKey } from '../../domain/quiz/daily-track';
import {
  readLocalDailyAttempts,
  readPlayerSave,
  reportSaveError,
} from './player-storage';
import {
  persistLocalRound,
  readLocalRound,
  removeLocalRound,
} from './round-storage';
import { reportSaveIssue } from './save-health';
export const inspectRoundStorage = () => {
  const active = readLocalRound();
  if (active) parseActiveGameSave(active);
  for (const value of Object.values(readLocalDailyAttempts()))
    parseActiveGameSave(value);
};

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
  const stored = readLocalRound();
  if (!stored) return null;
  let snapshot: ActiveGameSnapshot;
  try {
    snapshot = parseActiveGameSave(stored);
  } catch (error) {
    reportSaveIssue(error);
    return null;
  }
  try {
    if ((snapshot.playerRestoreId ?? null) !== readPlayerSave().restoreId) {
      void clearActiveGame().catch(reportSaveError);
      return null;
    }
  } catch {
    return null;
  }
  if (
    !snapshot.questions.every((question) =>
      normalizeQuestionPokemon(question, catalog),
    ) ||
    !snapshot.answers.every((answer, index) => {
      const question = snapshot.questions[index];
      return (
        answer.category === question?.category &&
        answer.questionType === question.questionType &&
        answer.subject.kind === question.subject.kind &&
        answer.subject.name === question.subject.name &&
        answer.subject.generation === question.subject.generation
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

export const writeActiveGame = async (
  snapshot: Omit<ActiveGameSnapshot, 'version'>,
): Promise<void> => {
  const playerRestoreId = readPlayerSave().restoreId;
  if (
    snapshot.playerRestoreId !== undefined &&
    snapshot.playerRestoreId !== playerRestoreId
  )
    throw new Error('Another tab restored a save. Reload before continuing.');
  await persistLocalRound({
    ...snapshot,
    playerRestoreId,
    version: SAVE_SCHEMA_VERSION,
  });
};

export const clearActiveGame = removeLocalRound;

export const readDailyAttempts = (
  date: string,
  restoreId: string | null,
): Record<string, ActiveGameSnapshot> => {
  const stored = readLocalDailyAttempts();
  const attempts: Record<string, ActiveGameSnapshot> = {};
  for (const [key, value] of Object.entries(stored)) {
    if (!key.startsWith(`${date}:`)) continue;
    const snapshot = parseActiveGameSave(value);
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
