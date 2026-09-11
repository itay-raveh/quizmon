import { gameSessionReducer, initialGameSession } from '@/app/game-session';
import type {
  AnswerResult,
  GameResult,
  QuestionData,
} from '@/domain/quiz/types';
import { defaultGameSettings } from '@/domain/settings/game-settings';

const question: QuestionData = {
  repetition: {
    identity: 'pikachu',
    subjects: ['pikachu'],
    primary: ['pikachu'],
    distractors: [],
  },
  answer: { correctOptions: ['pikachu'], interaction: 'single-choice' },
  category: 'identity',
  generation: 'I',
  id: 'identity:pikachu:0',
  media: { kind: 'none' },
  options: ['pikachu'],
  pokemonName: 'pikachu',
  pokemonTypes: ['electric'],
  prompt: { kind: 'text', text: 'Who is this Pokémon?' },
  questionType: 'pokedex-scan',
};

const answer: AnswerResult = {
  category: 'identity',
  cluesUsed: 0,
  correct: true,
  generation: 'I',
  pokemonName: 'pikachu',
  points: 1_000,
  questionType: 'pokedex-scan',
};

const result: GameResult = {
  answers: [answer],
  contentVersion: 1,
  correctCount: 1,
  elapsedSeconds: 2,
  questionCount: 1,
  score: 4_000,
  scoreVersion: 2,
};

const roundDefaults = {
  contentVersion: 14,
  mode: { kind: 'training' as const },
  settings: defaultGameSettings,
  questions: [question],
};

describe('gameSessionReducer', () => {
  it('moves through a complete game without partial result state', () => {
    const started = gameSessionReducer(initialGameSession, {
      ...roundDefaults,
      seed: 'round-1',
      type: 'started',
    });
    expect(started).toMatchObject({
      answers: [],
      phase: 'questions',
      questionIndex: 0,
      questions: [question],
    });

    const completed = gameSessionReducer(started, {
      bestResult: result,
      isNewBest: true,
      result,
      resultSaved: true,
      progressChanges: [],
      type: 'completed',
    });
    expect(completed).toEqual({
      bestResult: result,
      isNewBest: true,
      mode: { kind: 'training' },
      settings: defaultGameSettings,
      phase: 'results',
      result,
      resultSaved: true,
      seed: 'round-1',
      progressChanges: [],
    });
  });

  it('advances answers and updates only live experience settings', () => {
    const started = gameSessionReducer(initialGameSession, {
      ...roundDefaults,
      questions: [question, { ...question, id: 'identity:eevee:1' }],
      seed: 'round-2',
      type: 'started',
    });
    const recorded = gameSessionReducer(started, {
      answer,
      type: 'answer-recorded',
    });
    const advanced = gameSessionReducer(recorded, {
      answer,
      type: 'advanced',
    });
    const updated = gameSessionReducer(advanced, {
      settings: {
        ...defaultGameSettings,
        answerFlow: 'instant',
        generations: ['IX'],
        reduceMotion: true,
        soundVolume: 0,
        timerDisplay: 'milliseconds',
      },
      type: 'settings-updated',
    });

    expect(updated).toMatchObject({
      answers: [answer],
      settings: {
        answerFlow: 'instant',
        reduceMotion: true,
        soundVolume: 0,
        timerDisplay: 'milliseconds',
      },
      phase: 'questions',
      questionIndex: 1,
    });
    expect(updated).toMatchObject({
      settings: { generations: defaultGameSettings.generations },
    });
    expect(gameSessionReducer(updated, { type: 'returned-to-landing' })).toBe(
      initialGameSession,
    );
  });

  it.each([
    { answers: [], expectedIndex: 0 },
    { answers: [answer], expectedIndex: 1 },
    { answers: [answer, answer], expectedIndex: 1 },
  ])(
    'restores the answer position for $answers.length saved answers',
    ({ answers, expectedIndex }) => {
      const restored = gameSessionReducer(initialGameSession, {
        answers,
        ...roundDefaults,
        questions: [question, { ...question, id: 'identity:eevee:1' }],
        seed: 'saved-round',
        type: 'restored',
      });

      expect(restored).toMatchObject({
        answers,
        phase: 'questions',
        questionIndex: expectedIndex,
        seed: 'saved-round',
      });
    },
  );

  it('ignores phase-specific actions outside an active game', () => {
    expect(
      gameSessionReducer(initialGameSession, { answer, type: 'advanced' }),
    ).toBe(initialGameSession);
  });

  it.each([0, 1, 2])(
    'records one answer when advancing after %i answer notifications',
    (notifications) => {
      let session = gameSessionReducer(initialGameSession, {
        ...roundDefaults,
        questions: [question, { ...question, id: 'next-question' }],
        seed: 'record-once',
        type: 'started',
      });
      for (let index = 0; index < notifications; index += 1) {
        const previous = session;
        session = gameSessionReducer(session, {
          answer,
          type: 'answer-recorded',
        });
        if (index > 0) expect(session).toBe(previous);
      }
      expect(
        gameSessionReducer(session, { answer, type: 'advanced' }),
      ).toMatchObject({ answers: [answer], questionIndex: 1 });
    },
  );

  it('keeps the recorded answer and ignores advancement past the last question', () => {
    const session = gameSessionReducer(initialGameSession, {
      answers: [answer],
      ...roundDefaults,
      seed: 'last-question',
      type: 'restored',
    });
    for (const type of ['answer-recorded', 'advanced'] as const) {
      expect(
        gameSessionReducer(session, {
          answer: { ...answer, correct: false, points: 0 },
          type,
        }),
      ).toBe(session);
    }
  });
});
