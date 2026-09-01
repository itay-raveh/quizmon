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
      isNewBest={false}
      mode={{ kind: 'training' }}
      onNewGame={vi.fn()}
      onOpenSettings={vi.fn()}
      result={result}
      resultSaved
    />,
  );

describe('results summary', () => {
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
});
