import type { QuestionLineup } from '../quiz/question-lineup.ts';
import type {
  AnswerResult,
  GameMode,
  ScoreMultipliers,
} from '../quiz/types.ts';
import type { GameSettings } from '../settings/types.ts';
import { isRecord } from '../../lib/validation.ts';
import { SAVE_SCHEMA_VERSION } from './player-save.ts';
import { parseVersionedSave, SaveError } from './save-schema.ts';
import { parseRound } from './schemas/round.ts';
export interface ActiveGameSnapshot extends QuestionLineup {
  scoreMultipliers?: ScoreMultipliers;
  roundId?: string;
  completedAt?: string;
  answers: AnswerResult[];
  elapsedMilliseconds: number;
  mode: GameMode;
  settings: GameSettings;
  questionCount: number;
  playerRestoreId?: string | null;
  version: number;
}

const parseCurrentRound = (value: unknown): ActiveGameSnapshot => {
  const snapshot = parseRound(value);
  if (!snapshot)
    throw new SaveError('invalid', 'The unfinished round is invalid.');
  return snapshot;
};
export const parseActiveGameSave = (value: unknown): ActiveGameSnapshot => {
  const version = isRecord(value) ? value.version : undefined;
  return parseVersionedSave(
    { version, data: value },
    {
      currentVersion: SAVE_SCHEMA_VERSION,
      parseCurrent: parseCurrentRound,
    },
  ).data;
};
