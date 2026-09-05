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
      cluesUsed: 0,
      correct: index < correctCount,
      generation: 'I',
      pokemonName: `pokemon-${index}`,
      points: index < correctCount ? 1_000 : 0,
      questionType: 'pokedex-scan',
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
      onOpenTrainerCard={vi.fn()}
      onOpenSettings={vi.fn()}
      onRetryLeague={vi.fn()}
      onTrainAgain={vi.fn()}
      result={result}
      resultSaved
      badgeChanges={[]}
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
        onOpenTrainerCard={vi.fn()}
        onOpenSettings={vi.fn()}
        onRetryLeague={vi.fn()}
        onTrainAgain={vi.fn()}
        result={result}
        resultSaved
        badgeChanges={[]}
      />,
    );

    expect(
      screen.getByRole('img', { name: '7-day Daily Combo' }),
    ).toBeVisible();
    expect(screen.queryByText('Streak')).not.toBeInTheDocument();
    expect(screen.queryByText('Saved on this device.')).not.toBeInTheDocument();
  });

  it('keeps routine Trainer Card progress out of the result actions', () => {
    renderResults(makeResult(10, 5));

    expect(
      screen.queryByRole('button', { name: /Trainer Card/ }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Train again' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Back to start' })).toBeVisible();
  });

  it('names a newly earned League Badge', () => {
    const result = makeResult(10, 10);
    const onOpenTrainerCard = vi.fn();
    const rendered = renderResults(result);
    rendered.rerender(
      <Results
        bestResult={result}
        dailyStreak={0}
        isNewBest={false}
        mode={{ kind: 'training' }}
        onNewGame={vi.fn()}
        onOpenTrainerCard={onOpenTrainerCard}
        onOpenSettings={vi.fn()}
        onRetryLeague={vi.fn()}
        onTrainAgain={vi.fn()}
        result={result}
        resultSaved
        badgeChanges={[
          {
            id: 'perfect-form',
            label: 'Perfect Form',
          },
        ]}
      />,
    );

    expect(
      screen.getByRole('button', {
        name: /Perfect Form Badge earned.*Open your League Badge Case/,
      }),
    ).toBeVisible();

    screen
      .getByRole('button', {
        name: /Perfect Form Badge earned.*Open your League Badge Case/,
      })
      .click();
    expect(onOpenTrainerCard).toHaveBeenCalledWith('badges');
  });

  it('shows a direct retry after a failed League challenge', () => {
    const result = makeResult(15, 14);
    const onRetryLeague = vi.fn();
    render(
      <Results
        bestResult={result}
        dailyStreak={0}
        isNewBest={false}
        mode={{ kind: 'league' }}
        onNewGame={vi.fn()}
        onOpenTrainerCard={vi.fn()}
        onOpenSettings={vi.fn()}
        onRetryLeague={onRetryLeague}
        onTrainAgain={vi.fn()}
        result={result}
        resultSaved
        badgeChanges={[]}
      />,
    );

    expect(
      screen.getByRole('heading', { name: 'League challenge ended' }),
    ).toBeVisible();
    expect(screen.getByText('Champion')).toBeVisible();
    screen.getByRole('button', { name: 'Retry League' }).click();
    expect(onRetryLeague).toHaveBeenCalledOnce();
  });

  it('links a League victory directly to the Hall of Fame badge case', () => {
    const result = makeResult(15, 15);
    const onOpenTrainerCard = vi.fn();
    render(
      <Results
        bestResult={result}
        dailyStreak={0}
        isNewBest
        mode={{ kind: 'league' }}
        onNewGame={vi.fn()}
        onOpenTrainerCard={onOpenTrainerCard}
        onOpenSettings={vi.fn()}
        onRetryLeague={vi.fn()}
        onTrainAgain={vi.fn()}
        result={result}
        resultSaved
        badgeChanges={[]}
      />,
    );

    expect(
      screen.getByRole('heading', { name: 'League Champion' }),
    ).toBeVisible();
    screen
      .getByRole('button', { name: /Trainer Card updated.*Hall of Fame/ })
      .click();
    expect(onOpenTrainerCard).toHaveBeenCalledWith('badges');
  });
});
