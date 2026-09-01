import { render, screen } from '@testing-library/react';
import { AnimatedScore } from '@/components/AnimatedScore';

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

    render(<AnimatedScore format={String} value={750} />);
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
