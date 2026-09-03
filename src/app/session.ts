import type {
  AnswerResult,
  GameMode,
  GameResult,
  Modifiers,
  QuestionData,
} from '@/game/types';

export type GameSession =
  | { phase: 'landing' }
  | {
      answers: AnswerResult[];
      mode: GameMode;
      modifiers: Modifiers;
      phase: 'questions';
      questionIndex: number;
      questions: QuestionData[];
    }
  | {
      bestResult: GameResult;
      isNewBest: boolean;
      mode: GameMode;
      modifiers: Modifiers;
      phase: 'results';
      result: GameResult;
      resultSaved: boolean;
    };

export type GameSessionAction =
  | {
      mode: GameMode;
      modifiers: Modifiers;
      questions: QuestionData[];
      type: 'started';
    }
  | { answer: AnswerResult; type: 'advanced' }
  | {
      bestResult: GameResult;
      isNewBest: boolean;
      result: GameResult;
      resultSaved: boolean;
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
      };
    case 'advanced':
      return session.phase === 'questions'
        ? {
            ...session,
            answers: [...session.answers, action.answer],
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
