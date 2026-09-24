import { getQuestionPokemon } from '../quiz/question-pokemon.ts';
import type { GameResult, QuestionData } from '../quiz/types.ts';

export interface LeagueVictoryRecord {
  id: string;
  completedAt: string;
  trainerName: string;
  pokemon: string[];
  result: GameResult;
}

export const createLeagueVictoryRecord = (
  result: GameResult,
  questions: readonly QuestionData[],
  id: string,
  completedAt: string,
  trainerName: string,
): LeagueVictoryRecord => ({
  id,
  completedAt,
  trainerName,
  pokemon: [
    ...new Set(
      questions.flatMap((question, index) =>
        getQuestionPokemon(
          question,
          question.questionType !== 'champion' ||
            (result.answers[index]?.cluesUsed ?? 0) > 0,
        ),
      ),
    ),
  ],
  result,
});
