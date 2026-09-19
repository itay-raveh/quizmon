import { render, screen, within } from '@testing-library/react';
import { question } from '../../../tests/fixtures/question';
import { TypeAnswerPicker } from './TypeAnswerPicker';

it.each([
  ['single-choice', 'Correct', 'correct'],
  ['multi-select', 'Missed', 'missed'],
] as const)(
  'shows an unselected correct %s type as %s',
  (interaction, label, className) => {
    render(
      <TypeAnswerPicker
        question={{
          ...question,
          answer: { correctOptions: ['fire'], interaction },
          options: ['fire', 'water', 'grass', 'electric', 'normal'],
          questionType: 'natural-gift',
        }}
        selectedOptions={['water']}
        answered
        onSelect={vi.fn()}
      />,
    );

    const fire = screen
      .getByRole('img', { name: 'Fire' })
      .closest('[role="listitem"]');
    expect(fire).toHaveClass(`type-picker__result--${className}`);
    expect(within(fire as HTMLElement).getByText(label)).toHaveClass(
      'visually-hidden',
    );
    const water = screen
      .getByRole('img', { name: 'Water' })
      .closest('[role="listitem"]');
    expect(water).toHaveClass('type-picker__result--wrong');
    expect(within(water as HTMLElement).getByText('Wrong pick')).toHaveClass(
      'visually-hidden',
    );
  },
);
