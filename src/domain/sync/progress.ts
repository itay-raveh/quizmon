import type { AnswerResult, GameResult } from '../quiz/types.ts';
import type { GameSettings } from '../settings/types.ts';

export type TrainingConfig = Pick<
  GameSettings,
  'difficulty' | 'generations' | 'formGroups'
>;

export const trainingConfig = (settings: GameSettings): TrainingConfig => ({
  difficulty: settings.difficulty,
  generations: [...settings.generations],
  formGroups: [...settings.formGroups],
});

export interface RoundCompletion {
  completionId: string;
  mode: 'training' | 'daily' | 'league';
  dailyDate: string | null;
  training: TrainingConfig;
  completedAt: string;
  result: Omit<GameResult, 'answers'> & {
    answers: AnswerResult[];
    elapsedMilliseconds: number;
  };
}
