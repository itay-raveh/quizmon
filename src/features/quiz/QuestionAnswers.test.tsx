import { fireEvent, render, screen } from '@testing-library/react';
import { question } from '../../../tests/fixtures/question';
import { QuestionAnswers } from './QuestionAnswers';

const typeOptions = ['bug', 'dark', 'dragon', 'electric', 'fairy', 'fire'];

it.each([
  'move-types',
  'natural-gift',
  'evolution-shift',
  'type-check',
  'type-matchup',
] as const)('uses the type picker for long %s answer lists', (questionType) => {
  const onSelect = vi.fn();
  const { container } = render(
    <QuestionAnswers
      answered={false}
      onSelect={onSelect}
      question={{
        ...question,
        answer: { correctOptions: ['fire'], interaction: 'single-choice' },
        options: typeOptions,
        questionType,
      }}
      selectedOptions={[]}
    />,
  );

  expect(screen.getByRole('combobox', { name: 'Your type' })).toBeVisible();
  expect(container.querySelector('.answers')).toBeNull();
  fireEvent.change(screen.getByRole('combobox'), { target: { value: 'fir' } });
  fireEvent.click(screen.getByRole('option', { name: 'Fire' }));
  expect(onSelect).toHaveBeenCalledWith('fire');
});

it('keeps short type choices as answer buttons', () => {
  render(
    <QuestionAnswers
      answered={false}
      onSelect={vi.fn()}
      question={{
        ...question,
        answer: { correctOptions: ['fire'], interaction: 'single-choice' },
        options: typeOptions.slice(0, 4),
        questionType: 'move-types',
      }}
      selectedOptions={[]}
    />,
  );

  expect(screen.queryByRole('combobox')).toBeNull();
  expect(screen.getAllByRole('button')).toHaveLength(4);
});
