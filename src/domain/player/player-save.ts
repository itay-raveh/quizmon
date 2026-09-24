import {
  emptyQuestionHistory,
  type QuestionHistory,
} from '../quiz/question-history.ts';
import type { QuestionLineup } from '../quiz/question-lineup.ts';
import type { GameSettings } from '../settings/types.ts';
import type { LeagueVictoryRecord } from './hall-of-fame.ts';
import { emptyResults, type SavedResults } from './results.ts';
import type { TrainerProfile } from './trainer-profile.ts';
import { isRecord } from '../../lib/validation.ts';
import { parseVersionedSave, SaveError } from './save-schema.ts';
import { parsePlayerData } from './schemas/player-data.ts';
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
export const SAVE_SCHEMA_VERSION = 1;

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
  results: emptyResults(),
  settings: null,
});
export const parsePlayerSave = (value: unknown): PlayerSave => {
  const { data } = parseVersionedSave(value, {
    currentVersion: SAVE_SCHEMA_VERSION,
    parseCurrent: parsePlayerData,
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
