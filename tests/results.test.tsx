import { render, screen } from '@testing-library/react';
import { Results } from '@/components/Results';
import { defaultModifiers } from '@/game/game';
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
      modifiers={defaultModifiers}
      onNewGame={vi.fn()}
      onOpenTrainerCard={vi.fn()}
      onOpenSettings={vi.fn()}
      onRetryLeague={vi.fn()}
      onTrainAgain={vi.fn()}
      result={result}
      resultSaved
      progressChanges={[]}
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
    expect(screen.getByText('Speed')).toBeVisible();
    expect(screen.getByText('7,500')).toBeVisible();
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
        modifiers={defaultModifiers}
        onNewGame={vi.fn()}
        onOpenTrainerCard={vi.fn()}
        onOpenSettings={vi.fn()}
        onRetryLeague={vi.fn()}
        onTrainAgain={vi.fn()}
        result={result}
        resultSaved
        progressChanges={[]}
      />,
    );

    expect(
      screen.getByRole('img', { name: '7-day Daily Combo' }),
    ).toBeVisible();
    expect(screen.queryByText('Streak')).not.toBeInTheDocument();
    expect(screen.queryByText('Saved on this device.')).not.toBeInTheDocument();
  });

  it('uses header navigation and identifies the high-score key', () => {
    const rendered = renderResults(makeResult(10, 5));

    expect(screen.queryByText(/^Training$/)).not.toBeInTheDocument();
    expect(screen.getByText(/League best/)).toBeVisible();
    expect(screen.getByRole('button', { name: 'Train again' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Back to start' })).toBeVisible();
    expect(screen.queryByText('Back to start')).not.toBeInTheDocument();
    expect(
      rendered.container.querySelector('.share-result-button__icon'),
    ).toBeInTheDocument();
  });

  it('shows every badge and specialty that progressed', () => {
    const result = makeResult(10, 5);
    const onOpenTrainerCard = vi.fn();
    const rendered = render(
      <Results
        bestResult={result}
        dailyStreak={0}
        isNewBest={false}
        mode={{ kind: 'training' }}
        modifiers={defaultModifiers}
        onNewGame={vi.fn()}
        onOpenTrainerCard={onOpenTrainerCard}
        onOpenSettings={vi.fn()}
        onRetryLeague={vi.fn()}
        onTrainAgain={vi.fn()}
        result={result}
        resultSaved
        progressChanges={[
          {
            current: 6,
            delta: 2,
            earned: false,
            goal: 10,
            id: 'many-paths',
            kind: 'badge',
            label: 'Many Paths',
          },
          {
            current: 10,
            delta: 1,
            earned: true,
            goal: 10,
            kind: 'specialty',
            label: 'Type Specialist',
            specialty: 'type',
          },
        ]}
      />,
    );

    const progress = screen.getByRole('button', {
      name: /Trainer progress.*Trainer Title unlocked.*Type Specialist.*Many Paths.*6 \/ 10.*\+2/,
    });
    expect(progress).toBeVisible();
    expect(
      rendered.container.querySelector('.trainer-progress-change--earned'),
    ).toHaveTextContent('Type Specialist');
    progress.click();
    expect(onOpenTrainerCard).toHaveBeenCalledWith('badges');

    rendered.rerender(
      <Results
        bestResult={result}
        dailyStreak={0}
        isNewBest={false}
        mode={{ kind: 'training' }}
        modifiers={defaultModifiers}
        onNewGame={vi.fn()}
        onOpenTrainerCard={onOpenTrainerCard}
        onOpenSettings={vi.fn()}
        onRetryLeague={vi.fn()}
        onTrainAgain={vi.fn()}
        result={result}
        resultSaved
        progressChanges={[
          {
            current: 10,
            delta: 1,
            earned: true,
            goal: 10,
            kind: 'specialty',
            label: 'Type Specialist',
            specialty: 'type',
          },
        ]}
      />,
    );
    screen
      .getByRole('button', {
        name: /Trainer progress.*Open Trainer Titles.*Type Specialist/,
      })
      .click();
    expect(onOpenTrainerCard).toHaveBeenLastCalledWith('titles');
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
        modifiers={defaultModifiers}
        onNewGame={vi.fn()}
        onOpenTrainerCard={onOpenTrainerCard}
        onOpenSettings={vi.fn()}
        onRetryLeague={vi.fn()}
        onTrainAgain={vi.fn()}
        result={result}
        resultSaved
        progressChanges={[
          {
            current: 3,
            delta: 1,
            earned: true,
            goal: 3,
            id: 'perfect-form',
            kind: 'badge',
            label: 'Perfect Form',
          },
        ]}
      />,
    );

    expect(
      screen.getByRole('button', {
        name: /Trainer progress.*League Badge earned.*Perfect Form/,
      }),
    ).toBeVisible();

    screen
      .getByRole('button', {
        name: /Trainer progress.*League Badge earned.*Perfect Form/,
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
        modifiers={defaultModifiers}
        onNewGame={vi.fn()}
        onOpenTrainerCard={vi.fn()}
        onOpenSettings={vi.fn()}
        onRetryLeague={onRetryLeague}
        onTrainAgain={vi.fn()}
        result={result}
        resultSaved
        progressChanges={[]}
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
        modifiers={defaultModifiers}
        onNewGame={vi.fn()}
        onOpenTrainerCard={onOpenTrainerCard}
        onOpenSettings={vi.fn()}
        onRetryLeague={vi.fn()}
        onTrainAgain={vi.fn()}
        result={result}
        resultSaved
        progressChanges={[]}
      />,
    );

    expect(
      screen.getByRole('heading', { name: 'League Champion' }),
    ).toBeVisible();
    screen
      .getByRole('button', {
        name: /Trainer progress.*Milestone earned.*Hall of Fame/,
      })
      .click();
    expect(onOpenTrainerCard).toHaveBeenCalledWith('badges');
  });
});
