import type { Generation } from '../pokemon/types.ts';
import type { GameResult, SavedAnswerResult } from '../quiz/types.ts';

interface TrainerProgress {
  championAnswersWithoutClues: number;
  correctCategories: Partial<Record<SavedAnswerResult['category'], number>>;
  correctGenerations: Partial<Record<Generation, number>>;
  correctPokemon: string[];
  correctQuestionTypes: Partial<
    Record<NonNullable<SavedAnswerResult['questionType']>, number>
  >;
  masteryRounds: number;
  quickAttackRounds: number;
}

interface DailyStreakState {
  creditedDates: string[];
}

interface LeagueState {
  completed: boolean;
  seed: string | null;
}

export interface SavedResults {
  daily: Record<string, GameResult>;
  league: LeagueState;
  progress: TrainerProgress;
  streak: DailyStreakState;
  training: Partial<Record<`score:${number}`, GameResult>>;
}

export const emptyResults = (): SavedResults => ({
  daily: {},
  league: { completed: false, seed: null },
  progress: {
    championAnswersWithoutClues: 0,
    correctCategories: {},
    correctGenerations: {},
    correctPokemon: [],
    correctQuestionTypes: {},
    masteryRounds: 0,
    quickAttackRounds: 0,
  },
  streak: { creditedDates: [] },
  training: {},
});
