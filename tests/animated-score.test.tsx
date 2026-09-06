import { render, screen } from '@testing-library/react';
import { AnimatedScore } from '@/components/AnimatedScore';
import { MotionProvider } from '@/components/MotionProvider';

describe('AnimatedScore', () => {
  it('shows the final score immediately when reduced motion is requested', () => {
    const originalMatchMedia = Object.getOwnPropertyDescriptor(
      window,
      'matchMedia',
    );
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn().mockReturnValue({ matches: true }),
    });

    render(
      <MotionProvider reduceMotion={false}>
        <AnimatedScore format={String} value={750} />
      </MotionProvider>,
    );
    expect(screen.getByText('750')).toBeInTheDocument();

    if (originalMatchMedia) {
      Object.defineProperty(window, 'matchMedia', originalMatchMedia);
    } else {
      Object.defineProperty(window, 'matchMedia', {
        configurable: true,
        value: undefined,
      });
    }
  });
});
