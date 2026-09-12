import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TrainerTierProgress } from './TrainerTierProgress';

describe('Trainer tier progress', () => {
  it('shows the current count and next goal without a tier breakdown', () => {
    render(
      <TrainerTierProgress
        progress={{
          label: 'Field Researcher',
          current: 63,
          goal: 100,
          tier: 1,
        }}
      />,
    );
    expect(screen.getByText('63')).toBeVisible();
    expect(screen.getByText('/ 100')).toBeVisible();
    const bar = screen.getByRole('progressbar', {
      name: 'Field Researcher progress',
    });
    expect(bar).toHaveAttribute('value', '63');
    expect(bar).toHaveAttribute('max', '100');
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
    expect(
      screen.queryByText(/Next|Bronze|Silver|Gold/),
    ).not.toBeInTheDocument();
  });

  it.each([1000, 1250])(
    'shows the uncapped total %i without a bar after Gold',
    (current) => {
      render(
        <TrainerTierProgress
          progress={{ label: 'Field Researcher', current, goal: 1000, tier: 3 }}
        />,
      );
      expect(screen.getByText(current.toLocaleString())).toBeVisible();
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
      expect(screen.queryByText('/ 1,000')).not.toBeInTheDocument();
    },
  );
});
