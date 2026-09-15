import {
  isChoice,
  isRecord,
  isNonemptyChoiceArray,
} from '../../../lib/validation';
import { formGroups } from '../../pokemon/types';
import { questionTypes } from '../../quiz/questions/definitions';
import { retiredQuestionTypes, type GameResult } from '../../quiz/types';
import { getRulesScoreKey } from '../../quiz/round-rules';
import { getUnifiedScoreKey } from '../../quiz/scoring';
import { getBestResult } from '../../quiz/result-ranking';
import { defaultGameSettings } from '../../settings/game-settings';
import { trainingModes } from '../../settings/types';
import { SaveError, type SaveMigration } from '../save-schema';
import { playerMigrationV6 } from './player-v6';
import { isSavedResult } from './player-v7';

export const upgradeSettingsV5 = (value: unknown): unknown => {
  if (!isRecord(value)) return value;
  if (
    !Array.isArray(value.questionTypes) ||
    !isNonemptyChoiceArray(value.questionTypes, [
      ...questionTypes,
      ...retiredQuestionTypes,
    ])
  )
    throw new SaveError('invalid', 'The saved question selection is invalid.');
  const selected = value.questionTypes.filter((type) =>
    isChoice(type, questionTypes),
  );
  return {
    ...value,
    difficulty:
      value.difficulty === undefined
        ? defaultGameSettings.difficulty
        : value.difficulty,
    questionSelection:
      value.questionSelection === undefined
        ? defaultGameSettings.questionSelection
        : value.questionSelection,
    formGroups:
      value.formGroups === undefined ? [...formGroups] : value.formGroups,
    questionTypes: selected.length ? selected : [...questionTypes],
  };
};

const upgradePlayerV5 = (value: unknown): unknown => {
  if (
    !isRecord(value) ||
    !isRecord(value.results) ||
    !isRecord(value.results.training)
  )
    throw new SaveError('invalid', 'The version 5 score records are invalid.');
  const training: Partial<Record<`score:${number}`, GameResult>> = {};
  for (const [key, result] of Object.entries(value.results.training)) {
    if (
      !isSavedResult(result) ||
      !(isChoice(key, trainingModes) || getRulesScoreKey(result) === key)
    )
      throw new SaveError(
        'invalid',
        'The version 5 Training record is invalid.',
      );
    // Unversioned scores predate every numbered scoring revision.
    const saved =
      result.scoreVersion === undefined
        ? { ...result, scoreVersion: 0 }
        : result;
    const scoreKey = getUnifiedScoreKey(saved);
    const previous = training[scoreKey];
    training[scoreKey] = getBestResult(previous ? [previous, saved] : [saved]);
  }
  return {
    ...value,
    settings: upgradeSettingsV5(value.settings),
    results: {
      ...value.results,
      training,
      progress: isRecord(value.results.progress)
        ? {
            ...value.results.progress,
            quickAttackRounds:
              value.results.progress.quickAttackRounds === undefined
                ? Number(value.results.progress.quickAttackCompleted === true)
                : value.results.progress.quickAttackRounds,
          }
        : value.results.progress,
    },
  };
};

export const playerMigrationV5: SaveMigration = {
  parse(value) {
    playerMigrationV6.parse(upgradePlayerV5(value));
    return value;
  },
  upgrade: upgradePlayerV5,
};
