import type { QuestionLineup } from '../quiz/question-lineup';
import type { AnswerResult, GameMode, ScoreMultipliers } from '../quiz/types';
import type { GameSettings } from '../settings/types';
import { isRecord } from '../../lib/validation';
import { SAVE_SCHEMA_VERSION } from './player-save';
import {
  parseVersionedSave,
  SaveError,
  type SaveMigration,
} from './save-schema';
import { parseRoundV7 } from './schemas/round-v7';
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

const parseCurrentRound = (value: unknown): ActiveGameSnapshot => {
  const snapshot = parseRoundV7(value);
  if (!snapshot)
    throw new SaveError('invalid', 'The unfinished round is invalid.');
  return snapshot;
};
const migrations: Readonly<Record<number, SaveMigration>> = {
  6: {
    parse(value) {
      if (!isRecord(value) || value.version !== 3)
        throw new SaveError(
          'invalid',
          'The version 6 unfinished round is invalid.',
        );
      if (!parseRoundV7({ ...value, version: 7 }))
        throw new SaveError(
          'invalid',
          'The version 6 unfinished round is invalid.',
        );
      return value;
    },
    upgrade: (value) => ({ ...(value as object), version: 7 }),
  },
};

export const parseActiveGameSave = (value: unknown): ActiveGameSnapshot => {
  const version = isRecord(value) ? value.version : undefined;
  return parseVersionedSave(
    // Round format 3 was shipped with player schema 6 before the counters were unified.
    { version: version === 3 ? 6 : version, data: value },
    {
      minimumVersion: 6,
      currentVersion: SAVE_SCHEMA_VERSION,
      migrations,
      parseCurrent: parseCurrentRound,
    },
  ).data;
};
