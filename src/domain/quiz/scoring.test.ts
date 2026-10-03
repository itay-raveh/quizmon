import {
  getQuestionScore,
  getResponseTime,
  getRoundAnswerLevel,
  getScoreBreakdown,
} from './scoring';

describe('scoring', () => {
  it('reduces Champion points and speed when clues are used at any level', () => {
    const answer = {
      questionType: 'champion' as const,
      correct: true,
      responseMilliseconds: 0,
    };
    const full = getQuestionScore({ ...answer, cluesUsed: 0 }, 3);
    const helped = getQuestionScore({ ...answer, cluesUsed: 2 }, 3);
    const finalClue = getQuestionScore({ ...answer, cluesUsed: 3 }, 3);

    expect(full.answers).toBe(2_560);
    expect(full.speed).toBe(1_280);
    expect(helped.answers).toBe(1_280);
    expect(helped.speed).toBe(640);
    expect(finalClue.answers).toBe(640);
    expect(getQuestionScore({ ...answer, cluesUsed: 8 }, 3).score).toBe(
      finalClue.score,
    );
    expect(getQuestionScore({ ...answer, correct: false }, 3).score).toBe(0);
    expect(getQuestionScore(answer, 5).score).toBeGreaterThan(full.score);
  });

  it('sums each answer award without a whole-round mastery bonus', () => {
    const answers = [
      {
        questionType: 'pokemonTypes' as const,
        correct: true,
        responseMilliseconds: 0,
      },
      {
        questionType: 'pokemonTypes' as const,
        correct: false,
        responseMilliseconds: 0,
      },
      {
        questionType: 'champion' as const,
        correct: true,
        cluesUsed: 2,
        responseMilliseconds: 0,
      },
    ];
    const result = getScoreBreakdown(answers, 3);
    expect(result.score).toBe(result.answers + result.speed);
    expect(result.awards.map((award) => award.score)).toEqual([
      getQuestionScore(answers[0]!, 3).score,
      getQuestionScore(answers[0]!, 3).score,
      result.score,
    ]);
    expect(
      result.awards.reduce(
        (total, award) => total + award.points + award.speedBonus,
        0,
      ),
    ).toBe(result.score);
    expect(getScoreBreakdown([], 3).score).toBe(0);
  });

  it('uses the selected Training level, fixed Daily level, and League stages', () => {
    const answer = {
      questionType: 'champion' as const,
      correct: true,
      responseMilliseconds: 0,
    };
    expect(getRoundAnswerLevel({ kind: 'training' }, 4, 0)).toBe(4);
    expect(
      getRoundAnswerLevel({ kind: 'daily', date: '2026-09-11' }, undefined, 4),
    ).toBe(3);
    expect(getRoundAnswerLevel({ kind: 'league' }, undefined, 0)).toBe(1);
    expect(getRoundAnswerLevel({ kind: 'league' }, undefined, 14)).toBe(5);
    expect(
      getQuestionScore(
        answer,
        getRoundAnswerLevel({ kind: 'league' }, undefined, 14),
      ).score,
    ).toBeGreaterThan(
      getQuestionScore(
        answer,
        getRoundAnswerLevel(
          { kind: 'daily', date: '2026-09-11' },
          undefined,
          4,
        ),
      ).score,
    );
    expect(() =>
      getRoundAnswerLevel({ kind: 'training' }, undefined, 0),
    ).toThrow();
  });

  it('rewards a deliberate level increase only when accuracy holds up', () => {
    const answers = (
      correct: number,
      questionType: 'evYields' | 'evolutionChain' = 'evYields',
    ) =>
      Array.from({ length: 10 }, (_, index) => ({
        questionType,
        correct: index < correct,
        responseMilliseconds: 5000,
      }));
    const score = (
      correct: number,
      level: 4 | 5,
      type?: 'evYields' | 'evolutionChain',
    ) => getScoreBreakdown(answers(correct, type), level).score;

    expect(score(5, 5)).toBeLessThan(score(9, 4));
    expect(score(7, 5)).toBeGreaterThan(score(10, 4));
    expect(score(7, 5, 'evolutionChain')).toBeLessThan(score(10, 4));
    expect(score(5, 5)).toBe(Math.round(score(10, 5) / 2));
    expect(
      getScoreBreakdown(
        answers(10).map((answer) => ({ ...answer, responseMilliseconds: 0 })),
        5,
      ).score,
    ).toBe(98_304);
  });

  it('scores a saved answer even if its family is no longer offered at that level', () => {
    const oldAnswer = {
      questionType: 'pokemonTypes' as const,
      correct: true,
      responseMilliseconds: 5000,
    };
    const score = getQuestionScore(oldAnswer, 5).score;
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThan(
      getQuestionScore({ ...oldAnswer, questionType: 'evYields' }, 5).score,
    );
  });

  it('totals only active answer time', () => {
    expect(
      getResponseTime([
        { responseMilliseconds: 1_900 },
        { responseMilliseconds: 2_600 },
        {},
      ]),
    ).toEqual({ elapsedMilliseconds: 4_500, elapsedSeconds: 4 });
  });
});
