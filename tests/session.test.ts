import { gameSessionReducer, initialGameSession } from '@/app/session';
import { defaultModifiers } from '@/game/game';
import type { AnswerResult, GameResult, QuestionData } from '@/game/types';

const question: QuestionData = {
  answer: { correctOptions: ['pikachu'], interaction: 'single-choice' },
  category: 'identity',
  generation: 'I',
  id: 'identity:pikachu:0',
  media: { kind: 'none' },
  options: ['pikachu'],
  pokemonName: 'pikachu',
  prompt: { kind: 'text', text: 'Who is this Pokémon?' },
  questionType: 'pokedex-scan',
};

const answer: AnswerResult = {
  category: 'identity',
  cluesUsed: 0,
  correct: true,
  generation: 'I',
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

describe('gameSessionReducer', () => {
  it('moves through a complete game without partial result state', () => {
    const started = gameSessionReducer(initialGameSession, {
      mode: { kind: 'training' },
      modifiers: defaultModifiers,
      questions: [question],
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
      stampChanges: [],
      type: 'completed',
    });
    expect(completed).toEqual({
      bestResult: result,
      isNewBest: true,
      mode: { kind: 'training' },
      modifiers: defaultModifiers,
      phase: 'results',
      result,
      resultSaved: true,
      stampChanges: [],
    });
  });

  it('advances answers and updates only live experience settings', () => {
    const started = gameSessionReducer(initialGameSession, {
      mode: { kind: 'training' },
      modifiers: defaultModifiers,
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
      modifiers: {
        ...defaultModifiers,
        generations: ['IX'],
        soundEnabled: false,
        speedrunMode: true,
      },
      type: 'settings-updated',
    });

    expect(updated).toMatchObject({
      answers: [answer],
      modifiers: { soundEnabled: false, speedrunMode: true },
      phase: 'questions',
      questionIndex: 1,
    });
    expect(updated).toMatchObject({
      modifiers: { generations: defaultModifiers.generations },
    });
    expect(gameSessionReducer(updated, { type: 'returned-to-landing' })).toBe(
      initialGameSession,
    );
  });

  it('restores at the first unanswered question', () => {
    const restored = gameSessionReducer(initialGameSession, {
      answers: [answer],
      mode: { kind: 'training' },
      modifiers: defaultModifiers,
      questions: [question, { ...question, id: 'identity:eevee:1' }],
      seed: 'saved-round',
      type: 'restored',
    });

    expect(restored).toMatchObject({
      answers: [answer],
      phase: 'questions',
      questionIndex: 1,
      seed: 'saved-round',
    });
  });

  it('ignores phase-specific actions outside an active game', () => {
    expect(
      gameSessionReducer(initialGameSession, { answer, type: 'advanced' }),
    ).toBe(initialGameSession);
  });
});
