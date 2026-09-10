import { mockAnimationFrame } from './fixtures/animation-frame';
import { render, screen } from '@testing-library/react';
import { AnimatedScore } from '@/components/AnimatedScore';
import { MotionProvider } from '@/components/MotionProvider';

afterEach(() => vi.unstubAllGlobals());

describe('AnimatedScore', () => {
  it('shows the final score immediately when reduced motion is requested', () => {
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: true }));

    const playSound = vi.fn();
    render(
      <MotionProvider reduceMotion={false}>
        <AnimatedScore playSound={playSound} format={String} value={750} />
      </MotionProvider>,
    );
    expect(screen.getByText('750')).toBeInTheDocument();
    expect(playSound).not.toHaveBeenCalled();
  });
});

it('finishes 800 ms before playback ends and lets the audio tail continue', () => {
  const step = mockAnimationFrame();
  let positionMilliseconds = 0;
  const playback = {
    progress: vi.fn((endEarlyMilliseconds = 0) =>
      Math.min(positionMilliseconds / (3000 - endEarlyMilliseconds), 1),
    ),
    stop: vi.fn(),
  };
  const playSound = vi.fn(() => playback);
  const view = render(
    <AnimatedScore playSound={playSound} format={String} value={1000} />,
  );
  step(performance.now() + 5000);
  expect(screen.getByText('0')).toBeInTheDocument();
  positionMilliseconds = 1100;
  step(performance.now() + 6000);
  expect(screen.getByText('500')).toBeInTheDocument();
  positionMilliseconds = 2199;
  step(performance.now() + 7000);
  expect(screen.getByText('999')).toBeInTheDocument();
  expect(playback.stop).not.toHaveBeenCalled();
  positionMilliseconds = 2200;
  step(performance.now() + 8000);
  expect(screen.getByText('1000')).toBeInTheDocument();
  expect(playback.progress).toHaveBeenLastCalledWith(800);
  expect(playback.stop).not.toHaveBeenCalled();
  expect(playSound).toHaveBeenCalledOnce();
  view.unmount();
  expect(playback.stop).toHaveBeenCalledOnce();
});
