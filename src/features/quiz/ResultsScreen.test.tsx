import { render, screen } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { resetLocalSave } from '../../../tests/fixtures/local-save';
import { ReducedMotionContext } from '../../app/providers/motion-context';
import type { TrainerProgressChange } from '../../domain/player/trainer-progression';
import type { AnswerResult, GameResult } from '../../domain/quiz/types';
import { defaultGameSettings } from '../../domain/settings/game-settings';
import {
  SoundContext,
  silentSoundControls,
} from '../../lib/audio/sound-context';
import { ResultsScreen } from './ResultsScreen';

beforeEach(resetLocalSave);

const makeResult = (
  questionCount: number,
  correctCount: number,
): GameResult => {
  const answers: AnswerResult[] = Array.from(
    { length: questionCount },
    (_, index) => {
      const correct = index < correctCount;
      return {
        category: 'identity',
        cluesUsed: 0,
        correct,
        points: correct ? 1000 : 0,
        questionType: 'pokedex-scan',
        speedBonus: correct ? 1500 : 0,
        subject: {
          kind: 'pokemon' as const,
          generation: 'I',
          name: `pokemon-${index}`,
        },
      };
    },
  );
  return {
    answers,
    contentVersion: 5,
    correctCount,
    elapsedSeconds: 119,
    questionCount,
    score: 15000,
    scoreVersion: 3,
  };
};
const createResults = (
  result: GameResult,
  overrides: Partial<ComponentProps<typeof ResultsScreen>> = {},
  reduceMotion = true,
) => (
  <ReducedMotionContext value={reduceMotion}>
    <ResultsScreen
      bestResult={result}
      dailyStreak={0}
      isNewBest={false}
      mode={{ kind: 'training' }}
      settings={defaultGameSettings}
      onNewGame={vi.fn()}
      onRetryLeague={vi.fn()}
      onTrainAgain={vi.fn()}
      onStartTraining={vi.fn()}
      result={result}
      resultSaved
      progressChanges={[]}
      {...overrides}
    />
  </ReducedMotionContext>
);
const renderResults = (result: GameResult) => render(createResults(result));
describe('results summary', () => {
  it('shows a unified Training best and the saved factors despite changed settings', () => {
    const result: GameResult = {
      ...makeResult(10, 5),
      scoreVersion: 3,
      scoreMultipliers: {
        difficulty: 3,
        generations: 2,
        questionTypes: [{ questionType: 'sprite-match', multiplier: 0.75 }],
      },
      rules: {
        version: 1,
        difficulty: 3,
        generations: ['I', 'II'],
        formGroups: ['standard'],
        questionTypes: ['sprite-match'],
      },
    };
    render(
      createResults(result, {
        isNewBest: true,
        settings: { ...defaultGameSettings, difficulty: 5 },
      }),
    );
    expect(screen.getByText('New Training best!')).toBeVisible();
    expect(
      screen.queryByText(/best for this configuration/i),
    ).not.toBeInTheDocument();
    expect(screen.getByText('×3')).toBeVisible();
    expect(screen.getByText('×2')).toBeVisible();
    expect(screen.getByText('×0.75')).toBeVisible();
  });
  it('keeps minutes beyond an hour visible', () => {
    renderResults({ ...makeResult(10, 5), elapsedSeconds: 3606 });
    expect(screen.getByText('60:06')).toBeVisible();
  });
  it('preserves millisecond precision without an hours field', () => {
    render(
      createResults(
        { ...makeResult(10, 5), elapsedMilliseconds: 6123 },
        {
          settings: { ...defaultGameSettings, timerDisplay: 'milliseconds' },
        },
      ),
    );
    expect(screen.getByText('00:06.123')).toBeVisible();
  });
  it.each([5, 10])(
    'plays the score roll alongside Trainer progress with %i correct answers',
    (correctCount) => {
      const sounds = {
        ...silentSoundControls,
        playScoreCount: vi.fn(),
        playPerfect: vi.fn(),
        playResults: vi.fn(),
        stopCelebration: vi.fn(),
      };
      const { unmount } = render(
        <SoundContext value={sounds}>
          {createResults(
            makeResult(10, correctCount),
            {
              progressChanges: [
                {
                  current: 10,
                  previousTier: 0,
                  delta: 1,
                  earned: true,
                  tier: 1,
                  goal: 10,
                  kind: 'specialty',
                  label: 'Type Specialist',
                  specialty: 'type',
                },
              ],
            },
            false,
          )}
        </SoundContext>,
      );
      expect(sounds.playScoreCount).toHaveBeenCalledOnce();
      expect(sounds.playPerfect).not.toHaveBeenCalled();
      expect(sounds.playResults).not.toHaveBeenCalled();
      unmount();
      expect(sounds.stopCelebration).toHaveBeenCalledOnce();
    },
  );
  it('focuses the result heading and summarizes ten questions with an answer trail', () => {
    renderResults(makeResult(10, 5));
    expect(
      screen.queryByRole('button', { name: 'Settings' }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Training complete' }),
    ).toHaveFocus();
    expect(screen.getByText('01:59')).toBeVisible();
    expect(screen.queryByText(/seconds$/)).not.toBeInTheDocument();
    expect(screen.queryByText('Accuracy')).not.toBeInTheDocument();
    expect(
      screen.getByRole('list', { name: 'Question results' }),
    ).toBeVisible();
    expect(screen.getAllByRole('listitem')).toHaveLength(10);
    expect(screen.getByText('Speed')).toBeVisible();
    expect(screen.getByText('7,500')).toBeVisible();
  });
  it('celebrates a Daily Combo without adding another result statistic', () => {
    const result = makeResult(5, 3);
    render(
      createResults(result, {
        dailyStreak: 7,
        mode: { kind: 'daily', date: '2026-09-03' },
      }),
    );
    expect(
      screen.getByRole('img', { name: '7-day Daily Combo' }),
    ).toBeVisible();
    expect(screen.queryByText('Streak')).not.toBeInTheDocument();
    expect(screen.queryByText('Saved on this device.')).not.toBeInTheDocument();
  });
  it('shows every badge and specialty that progressed', () => {
    const result = makeResult(10, 5);
    const titleProgress: TrainerProgressChange = {
      current: 10,
      previousTier: 0,
      delta: 1,
      earned: true,
      tier: 1,
      goal: 10,
      kind: 'specialty',
      label: 'Type Specialist',
      specialty: 'type',
    };
    const rendered = render(
      createResults(result, {
        progressChanges: [
          {
            current: 6,
            previousTier: 0,
            delta: 2,
            earned: false,
            tier: 0,
            goal: 10,
            id: 'many-paths',
            kind: 'badge',
            label: 'Many Paths',
          },
          titleProgress,
        ],
      }),
    );
    const progress = screen.getByRole('group', {
      name: /Many Paths: \+2, 6 \/ 10/,
    });
    expect(progress).toBeVisible();
    expect(
      screen.getByRole('group', { name: /Type Specialist.*Bronze unlocked/ }),
    ).toHaveTextContent('Type Specialist');
    expect(progress).not.toHaveAttribute('tabindex');
    rendered.rerender(
      createResults(result, {
        progressChanges: [titleProgress],
      }),
    );
    expect(
      screen.getByRole('group', { name: /Type Specialist.*Bronze unlocked/ }),
    ).toBeVisible();
    expect(
      screen.queryByRole('button', { name: /Type Specialist/ }),
    ).not.toBeInTheDocument();
  });
  it('names a newly earned League Badge', () => {
    const result = makeResult(10, 10);
    render(
      createResults(result, {
        progressChanges: [
          {
            current: 3,
            previousTier: 0,
            delta: 1,
            earned: true,
            tier: 1,
            goal: 3,
            id: 'perfect-form',
            kind: 'badge',
            label: 'Perfect Form',
          },
        ],
      }),
    );
    const progress = screen.getByRole('group', {
      name: /Perfect Form.*Bronze unlocked/,
    });
    expect(progress).toBeVisible();
    expect(progress).not.toHaveAttribute('tabindex');
  });
  it('shows a direct retry after a failed League challenge', () => {
    const result = makeResult(15, 14);
    const onRetryLeague = vi.fn();
    render(
      createResults(result, {
        mode: { kind: 'league' },
        onRetryLeague,
      }),
    );
    expect(
      screen.getByRole('heading', { name: 'League challenge ended' }),
    ).toBeVisible();
    expect(
      screen.getByRole('list', { name: /Quizmon League progress. Champion/ }),
    ).toBeVisible();
    screen.getByRole('button', { name: 'Retry League' }).click();
    expect(onRetryLeague).toHaveBeenCalledOnce();
  });
  it('celebrates a League victory without a duplicate Hall of Fame link', () => {
    const result = makeResult(15, 15);
    render(
      createResults(result, {
        isNewBest: true,
        mode: { kind: 'league' },
      }),
    );
    expect(
      screen.getByRole('heading', { name: 'League Champion' }),
    ).toBeVisible();
    expect(screen.getByText('Hall of Fame')).toBeVisible();
    expect(
      screen.queryByRole('button', { name: /Hall of Fame/ }),
    ).not.toBeInTheDocument();
  });
});
it.each([1, 4, 9, 15])(
  'shows the five League stages after ending on question %i',
  (answered) => {
    const result = {
      ...makeResult(15, answered - 1),
      answers: makeResult(15, answered - 1).answers.slice(0, answered),
    };
    render(createResults(result, { mode: { kind: 'league' } }));
    expect(screen.queryByText('Reached')).not.toBeInTheDocument();
    expect(screen.queryByText('Correct')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('list', { name: 'Question results' }),
    ).not.toBeInTheDocument();
    const stages = screen.getByRole('list', {
      name: /Quizmon League progress/,
    });
    expect(stages.children).toHaveLength(5);
    expect(
      stages.querySelectorAll('.league-progress__stage--complete'),
    ).toHaveLength(Math.floor((answered - 1) / 3));
    expect(stages.querySelectorAll('[aria-current="step"]')).toHaveLength(1);
  },
);
it('marks all five trials complete after a League victory', () => {
  render(createResults(makeResult(15, 15), { mode: { kind: 'league' } }));
  const stages = screen.getByRole('list', {
    name: 'Quizmon League progress. All five trials complete.',
  });
  expect(
    stages.querySelectorAll('.league-progress__stage--complete'),
  ).toHaveLength(5);
  expect(stages.querySelector('[aria-current]')).toBeNull();
});
