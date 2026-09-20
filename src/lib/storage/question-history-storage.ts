import { rememberShownQuestion } from '../../domain/quiz/question-history';
import type { QuestionData } from '../../domain/quiz/types';
import { reportSaveError, transactPlayer } from './player-storage';

export const registerShownQuestion = async (
  question: QuestionData,
  roundId: string,
  index: number,
  restoreId: string | null,
): Promise<boolean> => {
  try {
    return await transactPlayer((state) => {
      if (state.save.restoreId !== restoreId) return false;
      state.save.data.questionHistory = rememberShownQuestion(
        state.save.data.questionHistory,
        question,
        roundId,
        index,
      );
      return true;
    });
  } catch (error) {
    reportSaveError(error);
    return false;
  }
};
