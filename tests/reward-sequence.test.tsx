import { act, render, screen } from '@testing-library/react';
import { SoundContext, silentSoundControls } from '@/audio/sound';
import { ReducedMotionContext } from '@/components/motion';
import { TrainerProgressSummary } from '@/components/TrainerProgressSummary';
import type { TrainerProgressChange } from '@/game/trainer';

const changes: TrainerProgressChange[] = [
  {
    kind: 'specialty',
    specialty: 'type',
    label: 'Type Specialist',
    tier: 2,
    previousTier: 2,
    earned: false,
    current: 231,
    delta: 10,
    goal: 1000,
  },
  {
    kind: 'badge',
    id: 'perfect-form',
    label: 'Perfect Form',
    tier: 3,
    previousTier: 2,
    earned: true,
    current: 100,
    delta: 2,
    goal: 100,
  },
];

let nextFrame: FrameRequestCallback;
const step = (time: number) => act(() => nextFrame(time));
beforeEach(() => {
  vi.spyOn(performance, 'now').mockReturnValue(0);
  vi.stubGlobal(
    'requestAnimationFrame',
    vi.fn((callback: FrameRequestCallback) => {
      nextFrame = callback;
      return 1;
    }),
  );
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it('credits numbers and fractional fills before revealing Gold, then cancels on departure', () => {
  const playReward = vi.fn();
  const stopRewards = vi.fn();
  const onOpenTrainerCard = vi.fn();
  const rendered = render(
    <SoundContext value={{ ...silentSoundControls, playReward, stopRewards }}>
      <TrainerProgressSummary
        progressChanges={changes}
        leagueVictory={false}
        onOpenTrainerCard={onOpenTrainerCard}
        onOpenHallOfFame={vi.fn()}
      />
    </SoundContext>,
  );
  const type = screen.getByRole('button', { name: /Type Specialist: \+10/ });
  const gold = screen.getByRole('button', {
    name: /Perfect Form.*Gold unlocked/,
  });
  expect(type).toHaveTextContent('221 / 1,000');
  expect(gold).toHaveAttribute('data-tier', '2');
  step(400);
  expect(type).not.toHaveTextContent('221 / 1,000');
  expect(type).not.toHaveTextContent('231 / 1,000');
  const fill = type.querySelector<HTMLElement>('.reward__track > span')!.style
    .transform;
  expect(Number(fill.slice(7, -1))).toBeGreaterThan(0.221);
  expect(Number(fill.slice(7, -1))).toBeLessThan(0.231);
  type.click();
  expect(onOpenTrainerCard).toHaveBeenCalledWith('titles');
  step(859);
  expect(gold).toHaveAttribute('data-tier', '2');
  step(860);
  expect(gold).toHaveAttribute('data-tier', '3');
  expect(gold).toHaveTextContent('Gold unlocked');
  expect(playReward).toHaveBeenCalledWith(1, 'gold');
  rendered.unmount();
  expect(cancelAnimationFrame).toHaveBeenCalled();
  expect(stopRewards).toHaveBeenCalled();
});

it('keeps every reward for long lists, finishes promptly, and settles when motion is disabled', () => {
  const many: TrainerProgressChange[] = [
    ...(
      [
        'ability',
        'description',
        'evolution',
        'identity',
        'matchup',
        'move',
        'stat',
        'type',
      ] as const
    ).map((specialty) => ({
      kind: 'specialty' as const,
      specialty,
      label: specialty,
      earned: false,
      goal: 1000,
      current: 1050,
      delta: 4,
      tier: 3 as const,
      previousTier: 3 as const,
    })),
    ...(
      [
        'many-paths',
        'pokedex-trail',
        'world-tour',
        'true-calling',
        'quick-attack',
        'perfect-form',
        'daily-resolve',
        'champions-instinct',
      ] as const
    ).map((id) => ({
      kind: 'badge' as const,
      id,
      label: id,
      earned: false,
      goal: 1000,
      current: 1050,
      delta: 4,
      tier: 3 as const,
      previousTier: 3 as const,
    })),
  ];
  const renderSummary = (reduced: boolean) => (
    <ReducedMotionContext value={reduced}>
      <TrainerProgressSummary
        progressChanges={many}
        leagueVictory={false}
        onOpenTrainerCard={vi.fn()}
        onOpenHallOfFame={vi.fn()}
      />
    </ReducedMotionContext>
  );
  const rendered = render(renderSummary(false));
  expect(screen.getAllByRole('button')).toHaveLength(16);
  step(2100);
  expect(screen.getAllByText('1,050 total')).toHaveLength(16);
  expect(screen.getAllByText('+4')).toHaveLength(16);
  rendered.rerender(renderSummary(true));
  expect(rendered.container.querySelector('.reward-case')).toHaveAttribute(
    'data-playing',
    'false',
  );
  expect(cancelAnimationFrame).toHaveBeenCalled();
});

it('finishes all visible progress and stops audio when the page is hidden', () => {
  const stopRewards = vi.fn();
  const rendered = render(
    <SoundContext value={{ ...silentSoundControls, stopRewards }}>
      <TrainerProgressSummary
        progressChanges={changes}
        leagueVictory={false}
        onOpenTrainerCard={vi.fn()}
        onOpenHallOfFame={vi.fn()}
      />
    </SoundContext>,
  );
  step(200);
  vi.spyOn(document, 'hidden', 'get').mockReturnValue(true);
  act(() => {
    document.dispatchEvent(new Event('visibilitychange'));
  });
  expect(rendered.container.querySelector('.reward-case')).toHaveAttribute(
    'data-playing',
    'false',
  );
  expect(screen.getByText('231 / 1,000')).toBeVisible();
  expect(stopRewards).toHaveBeenCalled();
});
