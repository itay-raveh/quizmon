import { render, screen } from '@testing-library/react';
import { Question } from '@/components/Question';
import type { QuestionData } from '@/game/types';

const question: QuestionData = {
  category: 'scale',
  correctOption: 'pikachu',
  id: 'scale:pikachu:0',
  media: { kind: 'none' },
  options: ['pikachu', 'eevee', 'ditto', 'mew'],
  pokemonName: 'pikachu',
  prompt: { kind: 'text', text: 'Which Pokémon is the lightest?' },
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

  it('renders Pokémon answers as numbered sprite nameplates', () => {
    const rendered = render(
      <Question
        elapsedSeconds={0}
        mode={{ kind: 'training' }}
        number={1}
        onAnswer={vi.fn()}
        onNewGame={vi.fn()}
        question={{
          ...question,
          optionVisuals: Object.fromEntries(
            question.options.map((option, index) => [
              option,
              {
                dexNumber: index + 1,
                src: `https://example.com/${option}.png`,
              },
            ]),
          ),
        }}
        speedrunMode={false}
        total={10}
      />,
    );

    expect(screen.getByRole('button', { name: 'Pikachu' })).toHaveClass(
      'answer--pokemon',
    );
    expect(rendered.container.querySelectorAll('.answer__sprite')).toHaveLength(
      4,
    );
    expect(screen.getByText('No. 0001')).toBeInTheDocument();
  });

  it('renders one compact portrait for text-valued answers', () => {
    const rendered = render(
      <Question
        elapsedSeconds={0}
        mode={{ kind: 'training' }}
        number={1}
        onAnswer={vi.fn()}
        onNewGame={vi.fn()}
        question={{
          ...question,
          category: 'type',
          correctOption: 'electric',
          media: {
            kind: 'pixel-sprite',
            src: 'https://example.com/pikachu.png',
          },
          options: ['electric', 'fire', 'grass', 'water'],
          prompt: {
            after: ' have?',
            before: 'Which type does ',
            dexNumber: 25,
            kind: 'pokemon',
            name: 'pikachu',
          },
        }}
        speedrunMode={false}
        total={10}
      />,
    );

    expect(
      rendered.container.querySelectorAll('.question__portrait'),
    ).toHaveLength(1);
    expect(rendered.container.querySelector('.answers')).not.toHaveClass(
      'answers--pokemon',
    );
    expect(screen.getByText('Pikachu').tagName).toBe('B');
    expect(screen.getByText('(No. 0025)')).toHaveClass(
      'question__subject-number',
    );
  });
});
