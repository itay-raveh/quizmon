import { render } from '@testing-library/react';
import { Question } from '@/components/Question';
import type { QuestionData } from '@/game/types';

const question: QuestionData = {
  category: 'scale',
  correctOption: 'pikachu',
  id: 'scale:pikachu:0',
  media: { kind: 'none' },
  options: ['pikachu', 'eevee', 'ditto', 'mew'],
  pokemonName: 'pikachu',
  prompt: 'Which Pokémon is the lightest?',
};

const renderQuestion = (number: number) =>
  render(
    <Question
      elapsedSeconds={0}
      mode={{ kind: 'training' }}
      number={number}
      onAnswer={vi.fn()}
      onNewGame={vi.fn()}
      question={question}
      speedrunMode={false}
      total={10}
    />,
  );

describe('question transitions', () => {
  it('animates the first question only', () => {
    const first = renderQuestion(1);
    expect(first.container.firstElementChild).toHaveClass('question--enter');
    first.unmount();

    const next = renderQuestion(2);
    expect(next.container.firstElementChild).not.toHaveClass('question--enter');
  });
});
