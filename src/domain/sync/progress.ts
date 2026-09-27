import type { AnswerResult, GameResult } from '../quiz/types.ts';
import { getTrainingSettings } from '../settings/game-settings.ts';
import type { GameSettings } from '../settings/types.ts';

export type TrainingConfig = Pick<
  GameSettings,
  | 'trainingMode'
  | 'generations'
  | 'questionTypes'
  | 'difficulty'
  | 'questionSelection'
  | 'automaticQuestionTypes'
> & { formGroups?: GameSettings['formGroups'] };

export const trainingConfig = (settings: GameSettings): TrainingConfig => ({
  trainingMode: settings.trainingMode,
  generations: [...settings.generations],
  questionTypes: [...settings.questionTypes],
  formGroups: [...settings.formGroups],
  ...(settings.difficulty === undefined
    ? {}
    : { difficulty: settings.difficulty }),
  ...(settings.questionSelection === undefined
    ? {}
    : { questionSelection: settings.questionSelection }),
  automaticQuestionTypes: [
    ...(settings.automaticQuestionTypes ??
      getTrainingSettings({ ...settings, questionSelection: 'automatic' })
        .questionTypes),
  ],
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
  discoveries: string[];
  victory: { trainerName: string; pokemon: string[] } | null;
}
