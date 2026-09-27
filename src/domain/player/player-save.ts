import {
  emptyQuestionHistory,
  type QuestionHistory,
} from '../quiz/question-history.ts';
import type { GameSettings } from '../settings/types.ts';
import type { LeagueVictoryRecord } from './hall-of-fame.ts';
import { emptyResults, type SavedResults } from './results.ts';
import type { TrainerProfile } from './trainer-profile.ts';
export interface PlayerData {
  profile: TrainerProfile | null;
  results: SavedResults;
  settings: GameSettings | null;
  questionHistory: QuestionHistory;
  pokedex: string[];
  hallOfFame: LeagueVictoryRecord[];
}
export interface PlayerSave {
  data: PlayerData;
  restoreId: string | null;
}
export const emptyPlayerData = (): PlayerData => ({
  questionHistory: emptyQuestionHistory(),
  hallOfFame: [],
  pokedex: [],
  profile: null,
  results: emptyResults(),
  settings: null,
});
