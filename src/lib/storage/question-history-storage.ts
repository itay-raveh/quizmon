import { rememberShownQuestion } from '../../domain/quiz/history';
import type { QuestionData } from '../../domain/quiz/types';
import {
  getPlayerDatabase,
  refreshPlayerData,
  reportSaveError,
} from './player-storage';
import { updateDeviceState } from './rxdb-game';

export const registerShownQuestion = async (
  question: QuestionData,
  roundId: string,
  index: number,
  restoreId: string | null,
): Promise<boolean> => {
  try {
    const saved = await updateDeviceState(getPlayerDatabase(), (state) => {
      if (state.restoreId !== restoreId) return false;
      state.questionHistory = rememberShownQuestion(
        state.questionHistory,
        question,
        roundId,
        index,
      );
      return true;
    });
    await refreshPlayerData();
    return saved;
  } catch (error) {
    reportSaveError(error);
    return false;
  }
};
