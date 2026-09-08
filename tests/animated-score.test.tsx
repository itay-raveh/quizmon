import { render, screen } from '@testing-library/react';
import { AnimatedScore } from '@/components/AnimatedScore';
import { MotionProvider } from '@/components/MotionProvider';

afterEach(() => vi.unstubAllGlobals());

describe('AnimatedScore', () => {
  it('shows the final score immediately when reduced motion is requested', () => {
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: true }));

    render(
      <MotionProvider reduceMotion={false}>
        <AnimatedScore format={String} value={750} />
      </MotionProvider>,
    );
    expect(screen.getByText('750')).toBeInTheDocument();
  });
});
