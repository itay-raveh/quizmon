import { render, screen } from '@testing-library/react';
import { Results } from '@/components/Results';
import type { AnswerResult, GameResult } from '@/game/types';

const makeResult = (
  questionCount: number,
  correctCount: number,
): GameResult => {
  const answers: AnswerResult[] = Array.from(
    { length: questionCount },
    (_, index) => ({
      category: 'identity',
      correct: index < correctCount,
      points: index < correctCount ? 1_000 : 0,
      speedBonus: index < correctCount ? 1_500 : 0,
    }),
  );

  return {
    answers,
    contentVersion: 5,
    correctCount,
    elapsedSeconds: 119,
    questionCount,
    score: 15_000,
    scoreVersion: 2,
  };
};

const renderResults = (result: GameResult) =>
  render(
    <Results
      bestResult={result}
      dailyStreak={0}
      isNewBest={false}
      mode={{ kind: 'training' }}
      onNewGame={vi.fn()}
      onOpenSettings={vi.fn()}
      onTrainAgain={vi.fn()}
      result={result}
      resultSaved
      trainerStats={{
        bestDailyStreak: 4,
        dailyChallengesCompleted: 7,
        gamesCompleted: 12,
        perfectRounds: 3,
        strongestCategory: { category: 'type', correct: 9, total: 10 },
      }}
    />,
  );

describe('results summary', () => {
  it('moves focus to the result heading', () => {
    renderResults(makeResult(10, 5));

    expect(
      screen.getByRole('heading', { name: 'Training complete' }),
    ).toHaveFocus();
  });

  it('uses the answer trail as the only accuracy summary for ten questions or fewer', () => {
    renderResults(makeResult(10, 5));

    expect(screen.getByText('00:01:59')).toBeVisible();
    expect(screen.queryByText(/seconds$/)).not.toBeInTheDocument();
    expect(screen.queryByText('Accuracy')).not.toBeInTheDocument();
    expect(
      screen.getByRole('list', { name: 'Question results' }),
    ).toBeVisible();
    expect(screen.getAllByRole('listitem')).toHaveLength(10);
    expect(screen.getByText(/7,500 speed/)).toBeVisible();
  });

  it('replaces the answer trail with a correct count for longer games', () => {
    renderResults(makeResult(11, 5));

    expect(screen.getByText('Correct')).toBeVisible();
    expect(screen.getByText('5 / 11')).toBeVisible();
    expect(
      screen.queryByRole('list', { name: 'Question results' }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/%$/)).not.toBeInTheDocument();
  });

  it('celebrates a Daily Combo without adding another result statistic', () => {
    const result = makeResult(5, 3);
    render(
      <Results
        bestResult={result}
        dailyStreak={7}
        isNewBest={false}
        mode={{ kind: 'daily', date: '2026-09-03' }}
        onNewGame={vi.fn()}
        onOpenSettings={vi.fn()}
        onTrainAgain={vi.fn()}
        result={result}
        resultSaved
        trainerStats={{
          bestDailyStreak: 7,
          dailyChallengesCompleted: 7,
          gamesCompleted: 12,
          perfectRounds: 3,
          strongestCategory: { category: 'type', correct: 9, total: 10 },
        }}
      />,
    );

    expect(
      screen.getByRole('img', { name: '7-day Daily Combo' }),
    ).toBeVisible();
    expect(screen.queryByText('Streak')).not.toBeInTheDocument();
    expect(screen.queryByText('Saved on this device.')).not.toBeInTheDocument();
  });

  it('shows local progression and keeps Training actions distinct', () => {
    renderResults(makeResult(10, 5));

    expect(screen.getByRole('heading', { name: 'Trainer Card' })).toBeVisible();
    expect(screen.getByText('12')).toBeVisible();
    expect(screen.getByText('Types')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Train again' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Back to start' })).toBeVisible();
  });
});
