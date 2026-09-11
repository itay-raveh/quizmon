import { getQuestionPokemon } from '../../domain/quiz/question-pokemon';
import type { QuestionData } from '../../domain/quiz/types';
import { readPlayerSave, updatePlayerData } from './player-storage';

export const registerPokedexAnswer = (
  question: QuestionData,
  correct: boolean,
): boolean => {
  if (!correct) return false;
  try {
    const existing = readPlayerSave().data.pokedex;
    const pokedex = new Set([...existing, ...getQuestionPokemon(question)]);
    return (
      pokedex.size === existing.length ||
      updatePlayerData({ pokedex: [...pokedex] })
    );
  } catch {
    return false;
  }
};
