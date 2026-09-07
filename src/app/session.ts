import { getExperienceSettings } from '@/game/game';
import type { LeagueVictoryRecord } from '@/game/hall-of-fame';
import type {
  AnswerResult,
  GameMode,
  GameResult,
  Modifiers,
  QuestionData,
} from '@/game/types';
import type { TrainerProgressChange } from '@/game/trainer';

export type StartGame = (
  questions: QuestionData[],
  modifiers: Modifiers,
  mode: GameMode,
  seed: string,
) => void;

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
      leagueRecord?: LeagueVictoryRecord;
      progressChanges: TrainerProgressChange[];
      seed: string;
    };

type GameRound = Omit<
  Extract<GameSession, { phase: 'questions' }>,
  'phase' | 'questionIndex'
>;

export type CompleteGame = (round: GameRound) => void;

export type GameSessionAction =
  | (Omit<GameRound, 'answers'> & { type: 'started' })
  | (GameRound & { type: 'restored' })
  | { answer: AnswerResult; type: 'answer-recorded' }
  | { answer: AnswerResult; type: 'advanced' }
  | (Omit<
      Extract<GameSession, { phase: 'results' }>,
      'phase' | 'mode' | 'modifiers' | 'seed'
    > & { type: 'completed' })
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
    case 'restored':
      return {
        answers: action.type === 'restored' ? action.answers : [],
        mode: action.mode,
        modifiers: action.modifiers,
        phase: 'questions',
        questionIndex:
          action.type === 'restored'
            ? Math.min(action.answers.length, action.questions.length - 1)
            : 0,
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
            leagueRecord: action.leagueRecord,
            seed: session.seed,
            progressChanges: action.progressChanges,
          }
        : session;
    case 'settings-updated':
      if (session.phase === 'questions') {
        return {
          ...session,
          modifiers: {
            ...session.modifiers,
            ...getExperienceSettings(action.modifiers),
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
