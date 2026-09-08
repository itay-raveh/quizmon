import { readPlayerSave, updatePlayerData } from './player-storage';
import { rememberShownQuestion } from './question-history';
import { buildLeagueQuestions } from './game';
import type { ExperienceSettings, PokemonCatalog, QuestionData } from './types';

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

export const getLeagueLineup = (
  catalog: PokemonCatalog,
  seed: string,
  experience: ExperienceSettings,
): QuestionData[] => {
  const { data } = readPlayerSave();
  const saved = data.leagueLineup;
  if (
    saved?.seed === seed &&
    saved.questions.length > 0 &&
    saved.contentVersion === catalog.contentVersion
  )
    return saved.questions;
  const legacy = saved?.seed === seed && saved.contentVersion === 0;
  const questions = buildLeagueQuestions(
    catalog,
    seed,
    experience,
    legacy ? undefined : data.questionHistory,
  );
  updatePlayerData({
    leagueLineup: { seed, contentVersion: catalog.contentVersion, questions },
  });
  return questions;
};
