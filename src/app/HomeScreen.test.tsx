import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ComponentProps } from 'react';
import type { GameResult } from '../domain/quiz/types';
import { shareResult } from '../features/sharing/result-sharing';
import { HomeScreen } from './HomeScreen';

vi.mock('../features/sharing/result-sharing', () => ({
  shareResult: vi.fn().mockResolvedValue('shared'),
}));

const props = (): ComponentProps<typeof HomeScreen> => ({
  catalogStatus: 'ready',
  dailyDate: '2026-09-19',
  dailyResult: null,
  dailyResultSaved: true,
  dailyStreak: 0,
  leagueUnlocked: false,
  onCustomizeTraining: vi.fn(),
  onRetryCatalog: vi.fn(),
  onStart: vi.fn(),
  onStartDaily: vi.fn(),
  onStartLeague: vi.fn(),
  storageAvailable: true,
});
const completed: GameResult = {
  answers: [],
  contentVersion: 5,
  correctCount: 3,
  elapsedSeconds: 15,
  questionCount: 5,
  score: 12500,
  scoreVersion: 3,
};

beforeEach(() => vi.clearAllMocks());

it('shows the completed Daily score in the share control', async () => {
  const values = props();
  render(<HomeScreen {...values} dailyResult={completed} />);
  expect(screen.getByText('Daily Challenge')).toBeVisible();
  expect(screen.getByText('12,500 points')).toBeVisible();
  expect(
    screen.queryByRole('button', { name: /Play Daily/ }),
  ).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Share result' }));
  expect(shareResult).toHaveBeenCalledExactlyOnceWith(
    { kind: 'daily', date: values.dailyDate, track: completed.dailyTrack },
    completed,
  );
  expect(values.onStartDaily).not.toHaveBeenCalled();
});

it('distinguishes an unsaved completion from a saved Daily', () => {
  render(
    <HomeScreen
      {...props()}
      dailyResult={completed}
      dailyResultSaved={false}
    />,
  );
  expect(screen.getByText(/Not saved/)).toBeVisible();
  expect(screen.getByText('Daily Challenge')).toBeVisible();
});

it('places customization beside Training and sends each play action to its own callback', async () => {
  const values = props();
  render(<HomeScreen {...values} leagueUnlocked />);
  await userEvent.click(
    screen.getByRole('button', { name: 'Customize training' }),
  );
  expect(values.onCustomizeTraining).toHaveBeenCalledOnce();
  expect(values.onStart).not.toHaveBeenCalled();
  await userEvent.click(screen.getByRole('button', { name: 'Start training' }));
  await userEvent.click(
    screen.getByRole('button', { name: /Play Daily Challenge/ }),
  );
  await userEvent.click(screen.getByRole('button', { name: 'Quizmon League' }));
  expect(values.onStart).toHaveBeenCalledOnce();
  expect(values.onStartDaily).toHaveBeenCalledOnce();
  expect(values.onStartLeague).toHaveBeenCalledOnce();
});

it('keeps unavailable play actions disabled without adding a locked League destination', () => {
  const values = props();
  const rendered = render(<HomeScreen {...values} catalogStatus="loading" />);
  expect(
    screen.getByRole('button', { name: /Play Daily Challenge/ }),
  ).toBeDisabled();
  expect(
    screen.getByRole('button', { name: 'Customize training' }),
  ).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Start training' })).toBeDisabled();
  expect(
    screen.queryByRole('button', { name: 'Quizmon League' }),
  ).not.toBeInTheDocument();
  rendered.rerender(<HomeScreen {...values} storageAvailable={false} />);
  expect(
    screen.getByRole('button', { name: /Play Daily Challenge/ }),
  ).toBeDisabled();
  expect(screen.getByText(/Browser storage required/)).toBeVisible();
});
