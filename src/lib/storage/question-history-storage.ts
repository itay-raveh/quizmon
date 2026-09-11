import { rememberShownQuestion } from '../../domain/quiz/question-history';
import type { QuestionData } from '../../domain/quiz/types';
import { readPlayerSave, updatePlayerData } from './player-storage';

export const registerShownQuestion = async (
  question: QuestionData,
  roundId: string,
  index: number,
  restoreId: string | null,
): Promise<boolean> => {
  const record = () => {
    try {
      const save = readPlayerSave();
      if (save.restoreId !== restoreId) return false;
      const previous = save.data.questionHistory;
      const questionHistory = rememberShownQuestion(
        previous,
        question,
        roundId,
        index,
      );
      return (
        questionHistory === previous || updatePlayerData({ questionHistory })
      );
    } catch {
      return false;
    }
  };
  return navigator.locks
    ? navigator.locks.request('quizmon.question-history', record)
    : record();
};
