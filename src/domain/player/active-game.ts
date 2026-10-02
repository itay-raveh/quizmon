import type { QuestionLineup } from '../quiz/lineup.ts';
import type { AnswerResult, GameMode } from '../quiz/types.ts';
import type { GameSettings } from '../settings/types.ts';
export interface ActiveGameSnapshot extends QuestionLineup {
  roundId: string;
  completedAt?: string;
  startedOn?: string;
  answers: AnswerResult[];
  elapsedMilliseconds: number;
  mode: GameMode;
  settings: GameSettings;
  questionCount: number;
  playerRestoreId?: string | null;
}
