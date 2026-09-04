import type {
  AnswerResult,
  GameMode,
  GameResult,
  Modifiers,
  QuestionData,
} from '@/game/types';
import type { TrainerBadgeChange } from '@/game/trainer';

export type GameSession =
  | { phase: 'landing' }
  | {
      answers: AnswerResult[];
      mode: GameMode;
      modifiers: Modifiers;
      phase: 'questions';
      questionIndex: number;
      questions: QuestionData[];
      seed: string;
    }
  | {
      bestResult: GameResult;
      isNewBest: boolean;
      mode: GameMode;
      modifiers: Modifiers;
      phase: 'results';
      result: GameResult;
      resultSaved: boolean;
      badgeChanges: TrainerBadgeChange[];
    };

export type GameSessionAction =
  | {
      mode: GameMode;
      modifiers: Modifiers;
      questions: QuestionData[];
      seed: string;
      type: 'started';
    }
  | {
      answers: AnswerResult[];
      mode: GameMode;
      modifiers: Modifiers;
      questions: QuestionData[];
      seed: string;
      type: 'restored';
    }
  | { answer: AnswerResult; type: 'answer-recorded' }
  | { answer: AnswerResult; type: 'advanced' }
  | {
      bestResult: GameResult;
      isNewBest: boolean;
      result: GameResult;
      resultSaved: boolean;
      badgeChanges: TrainerBadgeChange[];
      type: 'completed';
    }
  | {
      modifiers: Modifiers;
      type: 'settings-updated';
    }
  | { type: 'returned-to-landing' };

export const initialGameSession: GameSession = { phase: 'landing' };

export const gameSessionReducer = (
  session: GameSession,
  action: GameSessionAction,
): GameSession => {
  switch (action.type) {
    case 'started':
      return {
        answers: [],
        mode: action.mode,
        modifiers: action.modifiers,
        phase: 'questions',
        questionIndex: 0,
        questions: action.questions,
        seed: action.seed,
      };
    case 'restored':
      return {
        answers: action.answers,
        mode: action.mode,
        modifiers: action.modifiers,
        phase: 'questions',
        questionIndex: Math.min(
          action.answers.length,
          action.questions.length - 1,
        ),
        questions: action.questions,
        seed: action.seed,
      };
    case 'answer-recorded':
      return session.phase === 'questions' &&
        session.answers.length === session.questionIndex
        ? { ...session, answers: [...session.answers, action.answer] }
        : session;
    case 'advanced':
      if (session.phase !== 'questions') return session;
      return session.questionIndex < session.questions.length - 1
        ? {
            ...session,
            answers:
              session.answers.length === session.questionIndex
                ? [...session.answers, action.answer]
                : session.answers,
            questionIndex: session.questionIndex + 1,
          }
        : session;
    case 'completed':
      return session.phase === 'questions'
        ? {
            bestResult: action.bestResult,
            isNewBest: action.isNewBest,
            mode: session.mode,
            modifiers: session.modifiers,
            phase: 'results',
            result: action.result,
            resultSaved: action.resultSaved,
            badgeChanges: action.badgeChanges,
          }
        : session;
    case 'settings-updated':
      if (session.phase === 'questions') {
        return {
          ...session,
          modifiers: {
            ...session.modifiers,
            soundEnabled: action.modifiers.soundEnabled,
            speedrunMode: action.modifiers.speedrunMode,
          },
        };
      }
      return session.phase === 'results'
        ? { ...session, modifiers: action.modifiers }
        : session;
    case 'returned-to-landing':
      return initialGameSession;
  }
};
