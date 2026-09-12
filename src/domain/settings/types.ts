import type { FormGroup, Generation } from '../pokemon/types';
import type { QuestionType } from '../quiz/types';
import type { Difficulty } from '../quiz/difficulty';
export const trainingModes = ['league', 'custom'] as const;
export const answerFlows = ['manual', 'auto', 'instant'] as const;
export const timerDisplays = ['hidden', 'seconds', 'milliseconds'] as const;

export type TrainingMode = (typeof trainingModes)[number];
export type AnswerFlow = (typeof answerFlows)[number];
export type TimerDisplay = (typeof timerDisplays)[number];

export const answerFlowDelays: Record<Exclude<AnswerFlow, 'manual'>, number> = {
  auto: 2_000,
  instant: 300,
};

export interface ExperienceSettings {
  answerFlow: AnswerFlow;
  reduceMotion: boolean;
  soundVolume: number;
  timerDisplay: TimerDisplay;
}

export interface GameSettings extends ExperienceSettings {
  automaticQuestionTypes?: QuestionType[];
  difficulty?: Difficulty;
  questionSelection?: 'automatic' | 'custom';
  formGroups: FormGroup[];
  generations: Generation[];
  questionTypes: QuestionType[];
  trainingMode: TrainingMode;
}
