import type { LeagueVictoryRecord } from '@/domain/player/hall-of-fame';
import type { TrainerProgressChange } from '@/domain/player/trainer-progression';
import type {
  AnswerResult,
  GameMode,
  GameResult,
  QuestionData,
} from '@/domain/quiz/types';
import { getExperienceSettings } from '@/domain/settings/game-settings';
import type { GameSettings } from '@/domain/settings/types';

export type StartGame = (
  questions: QuestionData[],
  settings: GameSettings,
  mode: GameMode,
  seed: string,
) => boolean | void;

export type GameSession =
  | { phase: 'landing' }
  | {
      answers: AnswerResult[];
      contentVersion: number;
      mode: GameMode;
      settings: GameSettings;
      phase: 'questions';
      questionIndex: number;
      roundId?: string;
      questions: QuestionData[];
      seed: string;
    }
  | {
      bestResult: GameResult;
      isNewBest: boolean;
      mode: GameMode;
      settings: GameSettings;
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

export type CompleteGame = (round: GameRound) => boolean | void;

export type GameSessionAction =
  | (Omit<GameRound, 'answers'> & { type: 'started' })
  | (GameRound & { type: 'restored' })
  | { type: 'assistance'; count: number }
  | { answer: AnswerResult; type: 'answer-recorded' }
  | { answer: AnswerResult; type: 'advanced' }
  | (Omit<
      Extract<GameSession, { phase: 'results' }>,
      'phase' | 'mode' | 'settings' | 'seed'
    > & { type: 'completed' })
  | {
      settings: GameSettings;
      type: 'settings-updated';
    }
  | { type: 'returned-to-landing' };

export const initialGameSession: GameSession = { phase: 'landing' };

export const recordSessionAnswer = (
  session: Extract<GameSession, { phase: 'questions' }>,
  answer: AnswerResult,
): Extract<GameSession, { phase: 'questions' }> =>
  session.answers.length === session.questionIndex
    ? { ...session, answers: [...session.answers, answer] }
    : session;

export const gameSessionReducer = (
  session: GameSession,
  action: GameSessionAction,
): GameSession => {
  switch (action.type) {
    case 'started':
    case 'restored':
      return {
        answers: action.type === 'restored' ? action.answers : [],
        contentVersion: action.contentVersion,
        mode: action.mode,
        settings: action.settings,
        phase: 'questions',
        roundId: action.roundId ?? action.seed,
        questionIndex:
          action.type === 'restored'
            ? Math.min(action.answers.length, action.questions.length - 1)
            : 0,
        questions: action.questions,
        seed: action.seed,
      };
    case 'assistance':
      return session.phase === 'questions'
        ? {
            ...session,
            questions: session.questions.map((question, index) =>
              index === session.questionIndex
                ? { ...question, assistanceUsed: action.count }
                : question,
            ),
          }
        : session;
    case 'answer-recorded':
      return session.phase === 'questions'
        ? recordSessionAnswer(session, action.answer)
        : session;
    case 'advanced':
      if (session.phase !== 'questions') return session;
      return session.questionIndex < session.questions.length - 1
        ? {
            ...recordSessionAnswer(session, action.answer),
            questionIndex: session.questionIndex + 1,
          }
        : session;
    case 'completed':
      return session.phase === 'questions'
        ? {
            bestResult: action.bestResult,
            isNewBest: action.isNewBest,
            mode: session.mode,
            settings: session.settings,
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
          settings: {
            ...session.settings,
            ...getExperienceSettings(action.settings),
          },
        };
      }
      return session.phase === 'results'
        ? { ...session, settings: action.settings }
        : session;
    case 'returned-to-landing':
      return initialGameSession;
  }
};
