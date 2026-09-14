import { ReducedMotionContext } from '@/app/providers/motion-context';
import type { ScoreMultipliers } from '@/domain/quiz/types';
import { SoundContext, silentSoundControls } from '@/lib/audio/sound-context';
import { act, render, screen } from '@testing-library/react';
import { mockAnimationFrame } from '../../../tests/fixtures/animation-frame';
import { MultipliedScore } from './MultipliedScore';

const multipliers: ScoreMultipliers = {
  difficulty: 3,
  generations: 2,
  questionTypes: [{ questionType: 'sprite-match', multiplier: 0.75 }],
};
let step: ReturnType<typeof mockAnimationFrame>;
beforeEach(() => {
  vi.spyOn(performance, 'now').mockReturnValue(0);
  step = mockAnimationFrame();
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it('shows the base, applies each factor, and settles on the saved total', () => {
  const { container } = render(
    <MultipliedScore baseScore={1000} score={4500} multipliers={multipliers} />,
  );
  const counter = container.querySelector('.score strong')!;
  step(900);
  expect(counter).toHaveTextContent('1,000');
  expect(container.querySelector('.score-factors__active')).toHaveTextContent(
    'Difficulty',
  );
  step(1400);
  expect(counter).toHaveTextContent('3,000');
  step(1900);
  expect(counter).toHaveTextContent('6,000');
  expect(container.querySelector('.score-factors__active')).toHaveTextContent(
    'Question types',
  );
  step(2400);
  expect(counter).toHaveTextContent('4,500');
  expect(container.querySelector('.score-factors__active')).toBeNull();
  expect(screen.getByLabelText('Score 4,500')).toBeVisible();
});

it('shows the final score immediately without motion or counting audio', () => {
  const playScoreCount = vi.fn();
  const { container } = render(
    <ReducedMotionContext value={true}>
      <SoundContext value={{ ...silentSoundControls, playScoreCount }}>
        <MultipliedScore
          baseScore={1000}
          score={4500}
          multipliers={multipliers}
        />
      </SoundContext>
    </ReducedMotionContext>,
  );
  expect(container.querySelector('.score strong')).toHaveTextContent('4,500');
  expect(screen.getByRole('list', { name: 'Score multipliers' })).toBeVisible();
  expect(requestAnimationFrame).not.toHaveBeenCalled();
  expect(playScoreCount).not.toHaveBeenCalled();
});

it('stops audio and animation when hidden, and cancels on unmount', () => {
  const stop = vi.fn();
  const playScoreCount = vi.fn(() => ({ stop, progress: () => 0 }));
  const { container, unmount } = render(
    <SoundContext value={{ ...silentSoundControls, playScoreCount }}>
      <MultipliedScore
        baseScore={1000}
        score={4500}
        multipliers={multipliers}
      />
    </SoundContext>,
  );
  step(500);
  vi.spyOn(document, 'hidden', 'get').mockReturnValue(true);
  act(() => {
    document.dispatchEvent(new Event('visibilitychange'));
  });
  expect(container.querySelector('.score strong')).toHaveTextContent('4,500');
  expect(stop).toHaveBeenCalledOnce();
  unmount();
  expect(cancelAnimationFrame).toHaveBeenCalled();
});
