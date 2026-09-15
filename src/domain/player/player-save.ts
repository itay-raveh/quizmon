import {
  emptyQuestionHistory,
  type QuestionHistory,
} from '../quiz/question-history';
import type { QuestionLineup } from '../quiz/question-lineup';
import type { GameSettings } from '../settings/types';
import type { LeagueVictoryRecord } from './hall-of-fame';
import { normalizeResults, type SavedResults } from './results';
import type { TrainerProfile } from './trainer-profile';
import { isRecord } from '../../lib/validation';
import {
  parseVersionedSave,
  SaveError,
  type SaveMigration,
} from './save-schema';
import { parsePlayerDataV7 } from './schemas/player-v7';
import { playerMigrationV6 } from './schemas/player-v6';
export interface PlayerData {
  generationPromptAnswered: boolean;
  profile: TrainerProfile | null;
  results: SavedResults;
  settings: GameSettings | null;
  questionHistory: QuestionHistory;
  leagueLineup: QuestionLineup | null;
  pokedex: string[];
  hallOfFame: LeagueVictoryRecord[];
}
export const SAVE_SCHEMA_VERSION = 7;
const MINIMUM_SAVE_SCHEMA_VERSION = 6;

export interface PlayerSave {
  data: PlayerData;
  restoreId: string | null;
  version: typeof SAVE_SCHEMA_VERSION;
}
export const emptyPlayerData = (): PlayerData => ({
  questionHistory: emptyQuestionHistory(),
  leagueLineup: null,
  generationPromptAnswered: false,
  hallOfFame: [],
  pokedex: [],
  profile: null,
  results: normalizeResults(null),
  settings: null,
});
const migrations: Readonly<Record<number, SaveMigration>> = {
  6: playerMigrationV6,
};

export const parsePlayerSave = (value: unknown): PlayerSave => {
  const { data } = parseVersionedSave(value, {
    minimumVersion: MINIMUM_SAVE_SCHEMA_VERSION,
    currentVersion: SAVE_SCHEMA_VERSION,
    migrations,
    parseCurrent: parsePlayerDataV7,
  });
  if (
    !isRecord(value) ||
    (value.restoreId !== null &&
      !(
        typeof value.restoreId === 'string' &&
        value.restoreId.length > 0 &&
        value.restoreId.length <= 200
      ))
  )
    throw new SaveError(
      'invalid',
      'This save has an invalid restore identifier.',
    );
  return { data, restoreId: value.restoreId, version: SAVE_SCHEMA_VERSION };
};
