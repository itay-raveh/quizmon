import { getQuestionPokemon } from './pokedex';
import type { GameResult, QuestionData } from './types';

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
  seed: string,
  trainerName: string,
): LeagueVictoryRecord => ({
  id: `${result.contentVersion}:${seed}`,
  completedAt: new Date().toISOString(),
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
