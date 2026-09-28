import type { QuestionLineup } from '../quiz/lineup.ts';
import type {
  AnswerResult,
  GameMode,
  ScoreMultipliers,
} from '../quiz/types.ts';
import type { GameSettings } from '../settings/types.ts';
import { SaveError } from './save-schema.ts';
import { parseRound } from './schemas/round.ts';
export interface ActiveGameSnapshot extends QuestionLineup {
  scoreMultipliers?: ScoreMultipliers;
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

const parseCurrentRound = (value: unknown): ActiveGameSnapshot => {
  const snapshot = parseRound(value);
  if (!snapshot)
    throw new SaveError('invalid', 'The unfinished round is invalid.');
  return snapshot;
};
export const parseActiveGameSave = (value: unknown): ActiveGameSnapshot => {
  return parseCurrentRound(value);
};
