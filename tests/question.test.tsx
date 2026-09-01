import { fireEvent, render, screen } from '@testing-library/react';
import { Question } from '@/components/Question';
import type { QuestionData } from '@/game/types';

const question: QuestionData = {
  category: 'stat',
  correctOption: 'pikachu',
  id: 'stat:pikachu:0',
  media: { kind: 'none' },
  options: ['pikachu', 'eevee', 'ditto', 'mew'],
  pokemonName: 'pikachu',
  prompt: { kind: 'text', text: 'Which Pokémon has the highest Speed?' },
};

const renderQuestion = (number: number) =>
  render(
    <Question
      elapsedMilliseconds={0}
      elapsedSeconds={0}
      interactionPaused={false}
      mode={{ kind: 'training' }}
      number={number}
      onAnswer={vi.fn()}
      onNewGame={vi.fn()}
      onOpenSettings={vi.fn()}
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
        elapsedMilliseconds={0}
        elapsedSeconds={0}
        interactionPaused={false}
        mode={{ kind: 'training' }}
        number={1}
        onAnswer={vi.fn()}
        onNewGame={vi.fn()}
        onOpenSettings={vi.fn()}
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
        elapsedMilliseconds={0}
        elapsedSeconds={0}
        interactionPaused={false}
        mode={{ kind: 'training' }}
        number={1}
        onAnswer={vi.fn()}
        onNewGame={vi.fn()}
        onOpenSettings={vi.fn()}
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

  it('reveals a silhouette after an answer is selected', () => {
    render(
      <Question
        elapsedMilliseconds={0}
        elapsedSeconds={0}
        interactionPaused={false}
        mode={{ kind: 'training' }}
        number={1}
        onAnswer={vi.fn()}
        onNewGame={vi.fn()}
        onOpenSettings={vi.fn()}
        question={{
          ...question,
          category: 'identity',
          media: {
            kind: 'sprite',
            silhouette: true,
            src: 'https://example.com/pikachu.png',
          },
          prompt: {
            kind: 'text',
            text: 'Who is hiding in this silhouette?',
          },
        }}
        speedrunMode={false}
        total={10}
      />,
    );

    const sprite = screen.getByRole('img', { name: /silhouette/ });
    expect(sprite).toHaveClass('sprite--silhouette');

    fireEvent.click(screen.getByRole('button', { name: 'Pikachu' }));

    expect(sprite).not.toHaveClass('sprite--silhouette');
  });

  it('ignores answer shortcuts while settings are open', () => {
    render(
      <Question
        elapsedMilliseconds={0}
        elapsedSeconds={0}
        interactionPaused
        mode={{ kind: 'training' }}
        number={1}
        onAnswer={vi.fn()}
        onNewGame={vi.fn()}
        onOpenSettings={vi.fn()}
        question={question}
        speedrunMode={false}
        total={10}
      />,
    );

    fireEvent.keyDown(window, { key: '1' });

    expect(screen.getByRole('button', { name: 'Pikachu' })).toBeEnabled();
  });

  it('adds a time-based bonus to a correct answer', () => {
    const rendered = render(
      <Question
        elapsedMilliseconds={1_000}
        elapsedSeconds={1}
        interactionPaused={false}
        mode={{ kind: 'training' }}
        number={1}
        onAnswer={vi.fn()}
        onNewGame={vi.fn()}
        onOpenSettings={vi.fn()}
        question={question}
        speedrunMode={false}
        total={10}
      />,
    );

    rendered.rerender(
      <Question
        elapsedMilliseconds={3_000}
        elapsedSeconds={3}
        interactionPaused={false}
        mode={{ kind: 'training' }}
        number={1}
        onAnswer={vi.fn()}
        onNewGame={vi.fn()}
        onOpenSettings={vi.fn()}
        question={question}
        speedrunMode={false}
        total={10}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Pikachu' }));

    expect(screen.getByText('Correct! +121 points')).toBeVisible();
  });
});
