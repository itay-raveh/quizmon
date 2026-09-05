import { fireEvent, render, screen } from '@testing-library/react';
import { Question } from '@/components/Question';
import type { QuestionData } from '@/game/types';

const question: QuestionData = {
  answer: { correctOptions: ['pikachu'], interaction: 'single-choice' },
  category: 'stat',
  generation: 'I',
  id: 'stat:pikachu:0',
  media: { kind: 'none' },
  options: ['pikachu', 'eevee', 'ditto', 'mew'],
  pokemonName: 'pikachu',
  pokemonTypes: ['electric'],
  prompt: { kind: 'text', text: 'Which Pokémon has the highest Speed?' },
  questionType: 'stat-showdown',
};

const championQuestion: QuestionData = {
  answer: { correctOptions: ['pikachu'], interaction: 'single-choice' },
  category: 'champion',
  clues: ['An electric mouse.', 'Known for its red cheeks.'],
  generation: 'I',
  id: 'champion:pikachu:4',
  media: {
    kind: 'sprite',
    revealAt: 2,
    silhouette: true,
    src: 'https://example.com/pikachu.png',
  },
  options: ['pikachu', 'eevee', 'ditto', 'mew'],
  pokemonName: 'pikachu',
  pokemonTypes: ['electric'],
  prompt: {
    kind: 'text',
    text: '“It has small electric sacs on both its cheeks.”',
  },
  questionType: 'champion',
  searchOptions: [
    { dexNumber: 1, name: 'bulbasaur' },
    { dexNumber: 132, name: 'ditto' },
    { dexNumber: 133, name: 'eevee' },
    { dexNumber: 151, name: 'mew' },
    { dexNumber: 25, name: 'pikachu' },
    { dexNumber: 26, name: 'raichu' },
  ],
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
      onFeedbackStart={() => 0}
      onNewGame={vi.fn()}
      onOpenSettings={vi.fn()}
      question={question}
      speedrunMode={false}
      total={10}
    />,
  );

describe('question transitions', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('moves focus to each new question heading', () => {
    renderQuestion(1);

    expect(
      screen.getByRole('heading', { name: 'Stat showdown' }),
    ).toHaveFocus();
  });

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
        onFeedbackStart={() => 0}
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
                types: ['electric'],
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

  it('renders Pokémon answers with their numbers even without artwork', () => {
    const rendered = render(
      <Question
        elapsedMilliseconds={0}
        elapsedSeconds={0}
        interactionPaused={false}
        mode={{ kind: 'training' }}
        number={1}
        onAnswer={vi.fn()}
        onFeedbackStart={() => 0}
        onNewGame={vi.fn()}
        onOpenSettings={vi.fn()}
        question={{
          ...question,
          optionDexNumbers: {
            ditto: 132,
            eevee: 133,
            mew: 151,
            pikachu: 25,
          },
        }}
        speedrunMode={false}
        total={10}
      />,
    );

    expect(
      rendered.container.querySelectorAll('.answer__identity'),
    ).toHaveLength(4);
    expect(screen.getByText('No. 0025')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Pikachu' })).toBeEnabled();
  });

  it.each(['odd-one-out', 'type-roundup', 'counter-pick'] as const)(
    'reveals each Pokémon option type after an answer in %s',
    (questionType) => {
      const rendered = render(
        <Question
          elapsedMilliseconds={0}
          elapsedSeconds={0}
          interactionPaused={false}
          mode={{ kind: 'training' }}
          number={1}
          onAnswer={vi.fn()}
          onFeedbackStart={() => 0}
          onNewGame={vi.fn()}
          onOpenSettings={vi.fn()}
          question={{
            ...question,
            category: 'type',
            optionVisuals: Object.fromEntries(
              question.options.map((option, index) => [
                option,
                {
                  dexNumber: index + 1,
                  src: `https://example.com/${option}.png`,
                  types:
                    option === 'pikachu' ? ['electric'] : ['normal', 'fairy'],
                },
              ]),
            ),
            questionType,
          }}
          speedrunMode={false}
          total={10}
        />,
      );

      expect(
        rendered.container.querySelectorAll(
          '.answer__types--reserved .type-badge',
        ),
      ).toHaveLength(7);
      expect(
        rendered.container.querySelectorAll('.answer__types--reserved'),
      ).toHaveLength(4);
      expect(
        screen.getByRole('button', {
          name: 'Pikachu',
        }),
      ).toHaveAccessibleName('Pikachu');

      fireEvent.click(screen.getByRole('button', { name: 'Pikachu' }));

      expect(
        rendered.container.querySelectorAll('.answer__types--reserved'),
      ).toHaveLength(0);
      expect(
        rendered.container.querySelectorAll('.answer__types .type-badge'),
      ).toHaveLength(7);
      expect(
        screen.getByRole('button', {
          name: 'Pikachu. Type: Electric.',
        }),
      ).toHaveClass('answer--correct');
      expect(
        screen.getByRole('button', {
          name: 'Eevee. Types: Normal and Fairy.',
        }),
      ).toBeDisabled();
    },
  );

  it('reserves the normal-mode action row before an answer', () => {
    renderQuestion(1);

    const actionSlot = document.querySelector('.question__action-slot');
    expect(actionSlot?.querySelector('button')).toBeNull();
    expect(
      actionSlot?.querySelector('.question__action-reserve'),
    ).not.toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Pikachu' }));

    expect(actionSlot).toContainElement(
      screen.getByRole('button', { name: 'Next question' }),
    );
  });

  it('renders Type Check as a visual prompt and reveals the subject types', () => {
    const rendered = render(
      <Question
        elapsedMilliseconds={0}
        elapsedSeconds={0}
        interactionPaused={false}
        mode={{ kind: 'training' }}
        number={1}
        onAnswer={vi.fn()}
        onFeedbackStart={() => 0}
        onNewGame={vi.fn()}
        onOpenSettings={vi.fn()}
        question={{
          ...question,
          category: 'type',
          answer: {
            correctOptions: ['electric'],
            interaction: 'single-choice',
          },
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
          questionType: 'type-check',
          visual: { kind: 'type-check' },
        }}
        speedrunMode={false}
        total={10}
      />,
    );

    expect(
      rendered.container.querySelectorAll('.question__portrait'),
    ).toHaveLength(0);
    expect(
      rendered.container.querySelectorAll('.question-visual__pokemon'),
    ).toHaveLength(1);
    expect(
      rendered.container.querySelectorAll('.type-badge--mystery'),
    ).toHaveLength(1);
    expect(rendered.container.querySelector('.answers')).not.toHaveClass(
      'answers--pokemon',
    );
    const hiddenNumber = rendered.container.querySelector(
      '#question-prompt .question__subject-number',
    );
    const visibleNumber = rendered.container.querySelector(
      '.question-visual__prompt .question__subject-number',
    );
    expect(hiddenNumber).toHaveTextContent('(No. 0025)');
    expect(hiddenNumber?.closest('p')).toHaveClass('visually-hidden');
    expect(visibleNumber).toHaveTextContent('(No. 0025)');
    expect(visibleNumber).toBeVisible();
    expect(
      rendered.container.querySelectorAll('.answer__type-choice .type-badge'),
    ).toHaveLength(4);
    expect(screen.queryByRole('img', { name: /Pikachu type/ })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Electric' }));

    expect(
      rendered.container.querySelectorAll('.type-badge--mystery'),
    ).toHaveLength(0);
    expect(
      screen.getByRole('img', { name: 'Pikachu type: Electric.' }),
    ).toHaveClass('visually-hidden');
  });

  it('shows the Type Roundup instruction without repeating the pictured type', () => {
    render(
      <Question
        elapsedMilliseconds={0}
        elapsedSeconds={0}
        interactionPaused={false}
        mode={{ kind: 'training' }}
        number={1}
        onAnswer={vi.fn()}
        onFeedbackStart={() => 0}
        onNewGame={vi.fn()}
        onOpenSettings={vi.fn()}
        question={{
          ...question,
          answer: {
            correctOptions: ['pikachu', 'eevee'],
            interaction: 'multi-select',
          },
          category: 'type',
          prompt: {
            kind: 'text',
            text: 'Select every Electric-type Pokémon.',
          },
          questionType: 'type-roundup',
          visual: { kind: 'type-roundup', type: 'electric' },
        }}
        speedrunMode={false}
        total={10}
      />,
    );

    expect(screen.getByText('Select every Pokémon.')).toBeVisible();
    expect(screen.getByText('Select every Electric-type Pokémon.')).toHaveClass(
      'visually-hidden',
    );
    expect(
      document.querySelectorAll('.question-visual .type-badge'),
    ).toHaveLength(1);
  });

  it('reveals both ends of a Type Matchup diagram after answering', () => {
    const rendered = render(
      <Question
        elapsedMilliseconds={0}
        elapsedSeconds={0}
        interactionPaused={false}
        mode={{ kind: 'training' }}
        number={1}
        onAnswer={vi.fn()}
        onFeedbackStart={() => 0}
        onNewGame={vi.fn()}
        onOpenSettings={vi.fn()}
        question={{
          ...question,
          answer: {
            correctOptions: ['ground'],
            interaction: 'single-choice',
          },
          category: 'matchup',
          media: {
            kind: 'pixel-sprite',
            src: 'https://example.com/pikachu.png',
          },
          options: ['electric', 'normal', 'ground', 'fire'],
          pokemonName: 'pikachu',
          pokemonTypes: ['electric'],
          prompt: {
            after: '?',
            before: 'Which type is super effective against ',
            dexNumber: 25,
            kind: 'pokemon',
            name: 'pikachu',
          },
          questionType: 'type-matchup',
          visual: { kind: 'type-matchup', multiplier: 2 },
        }}
        speedrunMode={false}
        total={10}
      />,
    );

    expect(screen.getByText('×2')).toBeVisible();
    expect(screen.getByText('No. 0025')).toBeVisible();
    expect(
      rendered.container.querySelectorAll('.type-badge--mystery'),
    ).toHaveLength(1);
    expect(
      rendered.container.querySelectorAll(
        '.question-visual__subject-types .type-badge',
      ),
    ).toHaveLength(0);

    fireEvent.click(screen.getByRole('button', { name: 'Ground' }));

    expect(
      rendered.container.querySelectorAll('.type-badge--mystery'),
    ).toHaveLength(0);
    expect(
      rendered.container.querySelectorAll(
        '.question-visual__subject-types .type-badge',
      ),
    ).toHaveLength(1);
  });

  it('renders the Stat Showdown direction as part of the visual prompt', () => {
    const rendered = render(
      <Question
        elapsedMilliseconds={0}
        elapsedSeconds={0}
        interactionPaused={false}
        mode={{ kind: 'training' }}
        number={1}
        onAnswer={vi.fn()}
        onFeedbackStart={() => 0}
        onNewGame={vi.fn()}
        onOpenSettings={vi.fn()}
        question={{
          ...question,
          prompt: { kind: 'text', text: 'Which Pokémon has the lowest Speed?' },
          visual: {
            direction: 'lowest',
            kind: 'stat-showdown',
            stat: 'speed',
          },
        }}
        speedrunMode={false}
        total={10}
      />,
    );

    expect(
      rendered.container.querySelector('.question-visual__prompt'),
    ).toHaveTextContent('Which one has the lowest:');
    expect(
      rendered.container.querySelector('.question-visual__stat'),
    ).toHaveTextContent('Speed↓');
    expect(screen.getByText('Which Pokémon has the lowest Speed?')).toHaveClass(
      'visually-hidden',
    );
  });

  it('reveals the attacking Pokémon in Counter Pick', () => {
    const rendered = render(
      <Question
        elapsedMilliseconds={0}
        elapsedSeconds={0}
        interactionPaused={false}
        mode={{ kind: 'training' }}
        number={1}
        onAnswer={vi.fn()}
        onFeedbackStart={() => 0}
        onNewGame={vi.fn()}
        onOpenSettings={vi.fn()}
        question={{
          ...question,
          category: 'matchup',
          media: {
            kind: 'pixel-sprite',
            src: 'https://example.com/squirtle.png',
          },
          optionVisuals: Object.fromEntries(
            question.options.map((option, index) => [
              option,
              {
                dexNumber: index + 1,
                src: `https://example.com/${option}.png`,
                types: option === 'pikachu' ? ['electric'] : ['normal'],
              },
            ]),
          ),
          pokemonName: 'squirtle',
          pokemonTypes: ['water'],
          prompt: {
            after: ' super effectively?',
            before: 'Who can hit ',
            dexNumber: 7,
            kind: 'pokemon',
            name: 'squirtle',
          },
          questionType: 'counter-pick',
          visual: { kind: 'counter-pick', multiplier: 2 },
        }}
        speedrunMode={false}
        total={10}
      />,
    );

    expect(screen.getByText('×2')).toBeVisible();
    expect(screen.getByText('No. 0007')).toBeVisible();
    expect(
      rendered.container.querySelector('.question-visual__unknown-pokemon img'),
    ).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Pikachu' }));

    expect(
      rendered.container.querySelector(
        '.question-visual__unknown-pokemon img[src="https://example.com/pikachu.png"]',
      ),
    ).toBeInTheDocument();
    expect(
      rendered.container.querySelectorAll(
        '.question-visual__subject-types .type-badge',
      ),
    ).toHaveLength(1);
  });

  it('preloads and reveals the evolved Pokémon in Evolution Shift', () => {
    const preloadedSources: string[] = [];
    class PreloadImage {
      decoding = 'auto';
      fetchPriority = 'auto';

      set src(value: string) {
        preloadedSources.push(value);
      }
    }
    vi.stubGlobal('Image', PreloadImage);

    const rendered = render(
      <Question
        elapsedMilliseconds={0}
        elapsedSeconds={0}
        interactionPaused={false}
        mode={{ kind: 'training' }}
        number={1}
        onAnswer={vi.fn()}
        onFeedbackStart={() => 0}
        onNewGame={vi.fn()}
        onOpenSettings={vi.fn()}
        question={{
          ...question,
          answer: {
            correctOptions: ['steel'],
            interaction: 'single-choice',
          },
          category: 'evolution',
          media: {
            kind: 'pixel-sprite',
            src: 'https://example.com/onix.png',
          },
          options: ['electric', 'steel', 'fighting', 'normal'],
          pokemonName: 'onix',
          pokemonTypes: ['rock', 'ground'],
          prompt: {
            after: ' gain after evolving?',
            before: 'Which type can ',
            dexNumber: 95,
            kind: 'pokemon',
            name: 'onix',
          },
          questionType: 'evolution-shift',
          visual: {
            evolution: {
              dexNumber: 208,
              name: 'steelix',
              src: 'https://example.com/steelix.png',
              types: ['steel', 'ground'],
            },
            gainedType: 'steel',
            kind: 'evolution-shift',
          },
        }}
        speedrunMode={false}
        total={10}
      />,
    );

    expect(screen.getByText('?')).toBeVisible();
    expect(screen.getByText('No. 0095')).toBeVisible();
    expect(screen.queryByText('No. 0208')).toBeNull();
    expect(screen.queryByText('Steelix')).toBeNull();
    expect(preloadedSources).toContain('https://example.com/steelix.png');
    fireEvent.click(screen.getByRole('button', { name: 'Steel' }));
    expect(screen.getByText('Steelix')).toBeVisible();
    expect(screen.getByText('No. 0208')).toBeVisible();
    expect(
      rendered.container.querySelector(
        'img[src="https://example.com/steelix.png"]',
      ),
    ).toBeInTheDocument();
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
        onFeedbackStart={() => 0}
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
        onFeedbackStart={() => 0}
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

  it('keeps answer feedback visual and assistive-only', () => {
    render(
      <Question
        elapsedMilliseconds={3_000}
        elapsedSeconds={3}
        interactionPaused={false}
        mode={{ kind: 'training' }}
        number={1}
        onAnswer={vi.fn()}
        onFeedbackStart={() => 3_000}
        onNewGame={vi.fn()}
        onOpenSettings={vi.fn()}
        question={question}
        speedrunMode={false}
        total={10}
      />,
    );
    const answer = screen.getByRole('button', { name: 'Pikachu' });
    fireEvent.click(answer);

    expect(answer).toHaveClass('answer--correct');
    expect(answer.querySelector('kbd')).toHaveTextContent('✓');
    expect(screen.getByText('Correct.')).toHaveClass('visually-hidden');
    expect(screen.queryByText(/points/)).not.toBeInTheDocument();
    expect(document.querySelector('.answer-explanation')).toBeNull();
  });

  it('marks both the chosen wrong answer and the correct answer without color', () => {
    renderQuestion(1);

    const wrong = screen.getByRole('button', { name: 'Eevee' });
    const correct = screen.getByRole('button', { name: 'Pikachu' });
    fireEvent.click(wrong);

    expect(wrong).toHaveClass('answer--wrong');
    expect(wrong.querySelector('kbd')).toHaveTextContent('×');
    expect(correct).toHaveClass('answer--correct');
    expect(correct.querySelector('kbd')).toHaveTextContent('✓');
  });

  it.each([
    {
      label: 'Next question',
      mode: { kind: 'training' } as const,
      number: 1,
      total: 10,
    },
    {
      label: 'See results',
      mode: { date: '2026-09-03', kind: 'daily' } as const,
      number: 5,
      total: 5,
    },
  ])('waits for $label in $mode.kind', ({ label, mode, number, total }) => {
    const onAnswer = vi.fn();
    const onAnswerRecorded = vi.fn();
    const onFeedbackStart = vi.fn(() => 5_000);

    render(
      <Question
        elapsedMilliseconds={1_000}
        elapsedSeconds={1}
        interactionPaused={false}
        mode={mode}
        number={number}
        onAnswer={onAnswer}
        onAnswerRecorded={onAnswerRecorded}
        onFeedbackStart={onFeedbackStart}
        onNewGame={vi.fn()}
        onOpenSettings={vi.fn()}
        question={question}
        speedrunMode={false}
        total={total}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Pikachu' }));
    expect(onFeedbackStart).toHaveBeenCalledOnce();
    expect(onAnswerRecorded).toHaveBeenCalledWith(
      expect.objectContaining({ responseMilliseconds: 4_000 }),
    );
    expect(onAnswer).not.toHaveBeenCalled();
    const advance = screen.getByRole('button', { name: label });
    expect(advance).toHaveFocus();
    fireEvent.click(advance);
    expect(onAnswer).toHaveBeenCalledWith(
      expect.objectContaining({ responseMilliseconds: 4_000 }),
    );
  });

  it('keeps the 300 ms automatic advance in Quick mode', () => {
    vi.useFakeTimers();
    const onAnswer = vi.fn();

    render(
      <Question
        elapsedMilliseconds={1_000}
        elapsedSeconds={1}
        interactionPaused={false}
        mode={{ kind: 'training' }}
        number={1}
        onAnswer={onAnswer}
        onFeedbackStart={() => 5_000}
        onNewGame={vi.fn()}
        onOpenSettings={vi.fn()}
        question={question}
        speedrunMode
        total={10}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Pikachu' }));
    expect(screen.queryByRole('button', { name: 'Next question' })).toBeNull();
    expect(document.querySelector('.question__action-slot')).toBeNull();
    vi.advanceTimersByTime(299);
    expect(onAnswer).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onAnswer).toHaveBeenCalledOnce();
    vi.useRealTimers();
  });

  it('checks every selected answer in a multi-select question', () => {
    render(
      <Question
        elapsedMilliseconds={0}
        elapsedSeconds={0}
        interactionPaused={false}
        mode={{ kind: 'training' }}
        number={1}
        onAnswer={vi.fn()}
        onFeedbackStart={() => 0}
        onNewGame={vi.fn()}
        onOpenSettings={vi.fn()}
        question={{
          ...question,
          answer: {
            correctOptions: ['pikachu', 'eevee'],
            interaction: 'multi-select',
          },
        }}
        speedrunMode={false}
        total={10}
      />,
    );

    const check = screen.getByRole('button', { name: 'Check answers' });
    expect(check).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Pikachu' }));
    fireEvent.click(screen.getByRole('button', { name: 'Eevee' }));
    expect(check).toBeEnabled();
    fireEvent.click(check);

    expect(screen.getByRole('button', { name: 'Pikachu' })).toHaveClass(
      'answer--correct',
    );
    expect(screen.getByRole('button', { name: 'Eevee' })).toHaveClass(
      'answer--correct',
    );
    expect(screen.getByText('Correct.')).toHaveClass('visually-hidden');
  });

  it('reveals reverse-silhouette choices after an answer', () => {
    render(
      <Question
        elapsedMilliseconds={0}
        elapsedSeconds={0}
        interactionPaused={false}
        mode={{ kind: 'training' }}
        number={1}
        onAnswer={vi.fn()}
        onFeedbackStart={() => 0}
        onNewGame={vi.fn()}
        onOpenSettings={vi.fn()}
        question={{
          ...question,
          concealOptionLabels: true,
          optionVisuals: Object.fromEntries(
            question.options.map((option, index) => [
              option,
              {
                dexNumber: index + 1,
                silhouette: true,
                src: `https://example.com/${option}.png`,
                types: ['electric'],
              },
            ]),
          ),
        }}
        speedrunMode={false}
        total={10}
      />,
    );

    expect(screen.queryByText('Pikachu')).not.toBeInTheDocument();
    expect(screen.queryByText('Silhouette 1')).not.toBeInTheDocument();
    expect(
      document.querySelectorAll('.answer__sprite--silhouette'),
    ).toHaveLength(4);
    fireEvent.click(screen.getByRole('button', { name: 'Silhouette 1' }));

    expect(screen.getByText('Pikachu')).toBeVisible();
    expect(
      document.querySelectorAll('.answer__sprite--silhouette'),
    ).toHaveLength(0);
  });

  it('includes the number in every visible Pokémon prompt', () => {
    render(
      <Question
        elapsedMilliseconds={0}
        elapsedSeconds={0}
        interactionPaused={false}
        mode={{ kind: 'training' }}
        number={1}
        onAnswer={vi.fn()}
        onFeedbackStart={() => 0}
        onNewGame={vi.fn()}
        onOpenSettings={vi.fn()}
        question={{
          ...question,
          prompt: {
            after: '',
            before: 'Find ',
            dexNumber: 25,
            kind: 'pokemon',
            name: 'pikachu',
          },
          questionType: 'silhouette-match',
        }}
        speedrunMode={false}
        total={10}
      />,
    );

    expect(screen.getByText('(No. 0025)')).toBeVisible();
  });

  it('reveals the full sprite after a pixel peek answer', () => {
    const rendered = render(
      <Question
        elapsedMilliseconds={0}
        elapsedSeconds={0}
        interactionPaused={false}
        mode={{ kind: 'training' }}
        number={1}
        onAnswer={vi.fn()}
        onFeedbackStart={() => 0}
        onNewGame={vi.fn()}
        onOpenSettings={vi.fn()}
        question={{
          ...question,
          media: {
            focusX: 25,
            focusY: 75,
            kind: 'pixel-peek',
            src: 'https://example.com/pikachu.png',
          },
        }}
        speedrunMode={false}
        total={10}
      />,
    );

    expect(rendered.container.querySelector('.pixel-peek')).not.toHaveClass(
      'pixel-peek--revealed',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Pikachu' }));
    expect(rendered.container.querySelector('.pixel-peek')).toHaveClass(
      'pixel-peek--revealed',
    );
  });

  it('shows Pokédex numbers in Champion search suggestions', () => {
    render(
      <Question
        elapsedMilliseconds={0}
        elapsedSeconds={0}
        interactionPaused={false}
        mode={{ date: '2026-09-03', kind: 'daily' }}
        number={5}
        onAnswer={vi.fn()}
        onFeedbackStart={() => 1_000}
        onNewGame={vi.fn()}
        onOpenSettings={vi.fn()}
        question={championQuestion}
        speedrunMode={false}
        total={5}
      />,
    );

    fireEvent.change(screen.getByRole('combobox', { name: 'Your answer' }), {
      target: { value: 'pika' },
    });

    expect(screen.getByRole('option', { name: 'Pikachu' })).toBeVisible();
    expect(screen.getByText('No. 0025')).toBeVisible();
  });

  it('starts the Champion question as a keyboard-operable autocomplete', () => {
    const onAnswer = vi.fn();
    render(
      <Question
        elapsedMilliseconds={0}
        elapsedSeconds={0}
        interactionPaused={false}
        mode={{ date: '2026-09-03', kind: 'daily' }}
        number={5}
        onAnswer={onAnswer}
        onFeedbackStart={() => 1_000}
        onNewGame={vi.fn()}
        onOpenSettings={vi.fn()}
        question={championQuestion}
        speedrunMode={false}
        total={5}
      />,
    );

    const search = screen.getByRole('combobox', { name: 'Your answer' });
    expect(search).toBeVisible();
    expect(
      screen.getByText('“It has small electric sacs on both its cheeks.”'),
    ).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Pikachu' })).toBeNull();
    fireEvent.change(search, { target: { value: 'pika' } });
    const suggestion = screen.getByRole('option', { name: 'Pikachu' });
    expect(suggestion).toBeVisible();
    expect(suggestion.querySelector('img')).toBeNull();
    fireEvent.keyDown(search, { key: 'ArrowDown' });
    fireEvent.keyDown(search, { key: 'Enter' });
    expect(search).toHaveValue('Pikachu');
    fireEvent.click(screen.getByRole('button', { name: 'Guess' }));
    fireEvent.click(screen.getByRole('button', { name: 'See results' }));

    expect(onAnswer).toHaveBeenCalledWith(
      expect.objectContaining({ correct: true, points: 1_000 }),
    );
  });

  it('uses the first Champion clue to reveal four choices', () => {
    const onAnswer = vi.fn();
    render(
      <Question
        elapsedMilliseconds={0}
        elapsedSeconds={0}
        interactionPaused={false}
        mode={{ date: '2026-09-03', kind: 'daily' }}
        number={5}
        onAnswer={onAnswer}
        onFeedbackStart={() => 1_000}
        onNewGame={vi.fn()}
        onOpenSettings={vi.fn()}
        question={championQuestion}
        speedrunMode={false}
        total={5}
      />,
    );

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Show 4 choices · 750 points',
      }),
    );
    expect(screen.queryByRole('combobox')).toBeNull();
    expect(
      screen.getAllByRole('button', { name: /Pikachu|Eevee|Ditto|Mew/ }),
    ).toHaveLength(4);
    fireEvent.click(screen.getByRole('button', { name: 'Pikachu' }));
    fireEvent.click(screen.getByRole('button', { name: 'See results' }));

    expect(onAnswer).toHaveBeenCalledWith(
      expect.objectContaining({ correct: true, points: 750 }),
    );
  });

  it('keeps the League Champion question search-only and ends on a miss', () => {
    const onAnswer = vi.fn();
    render(
      <Question
        elapsedMilliseconds={0}
        elapsedSeconds={0}
        interactionPaused={false}
        mode={{ kind: 'league' }}
        number={15}
        onAnswer={onAnswer}
        onFeedbackStart={() => 1_000}
        onNewGame={vi.fn()}
        onOpenSettings={vi.fn()}
        question={championQuestion}
        speedrunMode={false}
        total={15}
      />,
    );

    expect(
      screen.getByRole('list', {
        name: /Quizmon League progress.*Champion, Final Trial/,
      }),
    ).toBeVisible();
    expect(
      screen.queryByRole('button', { name: /Show 4 choices/ }),
    ).not.toBeInTheDocument();

    const search = screen.getByRole('combobox', { name: 'Your answer' });
    fireEvent.change(search, { target: { value: 'bulb' } });
    fireEvent.pointerDown(screen.getByRole('option', { name: 'Bulbasaur' }));
    fireEvent.click(screen.getByRole('button', { name: 'Guess' }));
    fireEvent.click(screen.getByRole('button', { name: 'See result' }));

    expect(onAnswer).toHaveBeenCalledWith(
      expect.objectContaining({ correct: false }),
    );
  });
});
