import { render, screen } from '@testing-library/react';
import { catalog } from '../../../tests/fixtures/catalog';
import { QuestionAnswers } from '../../features/quiz/QuestionAnswers';
import type { QuestionData } from '../quiz/types';
import { attackMultiplier } from './type-effectiveness';
const question: QuestionData = {
  repetition: {
    identity: 'talonflame',
    subjects: ['talonflame'],
    primary: ['talonflame'],
    distractors: [],
  },
  answer: { correctOptions: ['water'], interaction: 'single-choice' },
  category: 'matchup',
  generation: 'VI',
  id: 'matchup:talonflame',
  media: { kind: 'none' },
  options: ['poison', 'dark', 'water', 'rock'],
  pokemonName: 'talonflame',
  pokemonTypes: ['fire', 'flying'],
  prompt: { kind: 'text', text: 'Which type deals ×2 damage?' },
  questionType: 'type-matchup',
  visual: { kind: 'type-matchup', multiplier: 2 },
};

it.each([
  ['water', ['fire', 'flying'], 2],
  ['rock', ['fire', 'flying'], 4],
  ['poison', ['fire', 'flying'], 1],
  ['fire', ['water', 'dragon'], 0.25],
  ['grass', ['fire'], 0.5],
  ['electric', ['water', 'ground'], 0],
  ['electric', ['ground', 'water'], 0],
] as const)('calculates %s against %s', (type, defenders, expected) => {
  expect(attackMultiplier(catalog, type, defenders)).toBe(expected);
});

it('conceals calculations until answering, then explains all options outside disabled buttons', () => {
  const props = {
    question,
    selectedOptions: ['rock'],
    onSelect: vi.fn(),
    typeRelations: catalog.typeRelations,
  };
  const { rerender } = render(<QuestionAnswers {...props} answered={false} />);
  expect(
    screen.queryByRole('button', { name: /Explain type effectiveness/ }),
  ).not.toBeInTheDocument();
  expect(screen.queryByText(/Type effectiveness only/)).not.toBeInTheDocument();
  rerender(<QuestionAnswers {...props} answered />);
  expect(document.querySelector('.matchup-help__attack')).toBeNull();
  for (const [name, multiplier] of [
    ['Poison', 1],
    ['Dark', 1],
    ['Water', 2],
    ['Rock', 4],
  ]) {
    const help = screen.getByRole('button', {
      name: `${name}: ×${multiplier} damage. Explain type effectiveness`,
    });
    expect(help).toBeEnabled();
    expect(help.parentElement?.closest('button')).toBeNull();
    const popover = document.getElementById(
      help.getAttribute('popovertarget')!,
    );
    expect(popover).toHaveAttribute('popover', 'auto');
  }
  expect(
    screen.getByLabelText(
      'Rock: 2 against Fire times 2 against Flying equals 4',
    ),
  ).toHaveTextContent('×2×22 × 2 = ×4');
});

it('shows separate attack calculations and takes the strongest type for Counter pick', () => {
  render(
    <QuestionAnswers
      answered
      onSelect={vi.fn()}
      selectedOptions={['kabutops']}
      typeRelations={catalog.typeRelations}
      question={{
        ...question,
        questionType: 'counter-pick',
        options: ['kabutops'],
        answer: { correctOptions: ['kabutops'], interaction: 'single-choice' },
        optionVisuals: {
          kabutops: {
            dexNumber: 141,
            src: '/kabutops.png',
            types: ['rock', 'water'],
          },
        },
        visual: { kind: 'counter-pick', multiplier: 4 },
      }}
    />,
  );
  expect(
    screen.getByRole('button', {
      name: 'Kabutops: ×4 damage. Explain type effectiveness',
    }),
  ).toBeEnabled();
  expect(screen.queryByText(/Strongest attack type/)).not.toBeInTheDocument();
  expect(
    screen.queryByText('Type effectiveness only.'),
  ).not.toBeInTheDocument();
  expect(screen.getByText('Rock').tagName).toBe('B');
  expect(screen.getByText('Water').tagName).not.toBe('B');
  expect(
    screen.getByLabelText(
      'Water: 2 against Fire times 1 against Flying equals 2',
    ),
  ).toHaveTextContent('= ×2');
  expect(document.querySelector('.matchup-help .pokemon-identity')).toBeNull();
});
