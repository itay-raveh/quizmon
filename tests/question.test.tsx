import { fireEvent, render, screen } from '@testing-library/react';
import type { ComponentProps } from 'react';
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

type QuestionProps = ComponentProps<typeof Question>;

const renderQuestion = (overrides: Partial<QuestionProps> = {}) =>
  render(
    <Question
      answerFlow="manual"
      elapsedMilliseconds={0}
      elapsedSeconds={0}
      interactionPaused={false}
      mode={{ kind: 'training' }}
      number={1}
      onAnswer={vi.fn()}
      onFeedbackStart={() => 0}
      onNewGame={vi.fn()}
      onOpenSettings={vi.fn()}
      question={question}
      timerDisplay="seconds"
      total={10}
      {...overrides}
    />,
  );

describe('question transitions', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('moves focus to each new question heading', () => {
    renderQuestion();

    expect(
      screen.getByRole('heading', { name: 'Stat showdown' }),
    ).toHaveFocus();
  });

  it('animates the first question only', () => {
    const first = renderQuestion();
    expect(first.container.firstElementChild).toHaveClass('question--enter');
    first.unmount();

    const next = renderQuestion({ number: 2 });
    expect(next.container.firstElementChild).not.toHaveClass('question--enter');
  });

  it('renders Pokémon answers as numbered sprite nameplates', () => {
    const rendered = renderQuestion({
      question: {
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
      },
    });

    expect(screen.getByRole('button', { name: 'Pikachu' })).toHaveClass(
      'answer--pokemon',
    );
    expect(rendered.container.querySelectorAll('.answer__sprite')).toHaveLength(
      4,
    );
    expect(screen.getByText('No. 0001')).toBeInTheDocument();
  });

  it('renders Pokémon answers with their numbers even without artwork', () => {
    const rendered = renderQuestion({
      question: {
        ...question,
        optionDexNumbers: {
          ditto: 132,
          eevee: 133,
          mew: 151,
          pikachu: 25,
        },
      },
    });

    expect(
      rendered.container.querySelectorAll('.answer__identity'),
    ).toHaveLength(4);
    expect(screen.getByText('No. 0025')).toBeVisible();
    expect(screen.getByText('Pikachu')).toHaveClass('answer__name');
    expect(screen.getByRole('button', { name: 'Pikachu' })).toBeEnabled();
  });

  it.each(['odd-one-out', 'type-roundup', 'counter-pick'] as const)(
    'reveals each Pokémon option type after an answer in %s',
    (questionType) => {
      const rendered = renderQuestion({
        question: {
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
        },
      });

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
    renderQuestion();

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
    const rendered = renderQuestion({
      question: {
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
      },
    });

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
      '.question-visual__subject-number',
    );
    expect(hiddenNumber).toHaveTextContent('(No. 0025)');
    expect(hiddenNumber?.closest('p')).toHaveClass('visually-hidden');
    expect(visibleNumber).toHaveTextContent('No. 0025');
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
    const rendered = renderQuestion({
      question: {
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
      },
    });

    const visiblePrompt = rendered.container.querySelector(
      '.question-visual__roundup-type',
    );
    expect(
      screen.getByText('Select every Pokémon with this type'),
    ).toBeVisible();
    expect(visiblePrompt?.querySelector('.type-badge')).toBeVisible();
    expect(screen.getByText('Select every Electric-type Pokémon.')).toHaveClass(
      'visually-hidden',
    );
    expect(
      document.querySelectorAll('.question-visual .type-badge'),
    ).toHaveLength(1);
  });

  it('reveals both ends of a Type Matchup diagram after answering', () => {
    const rendered = renderQuestion({
      question: {
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
      },
    });

    expect(screen.getByText('×2')).toBeVisible();
    expect(screen.getByText('No. 0025')).toBeVisible();
    expect(
      rendered.container.querySelectorAll('.type-badge--mystery'),
    ).toHaveLength(1);
    expect(
      rendered.container.querySelector('.question-visual__subject-types'),
    ).not.toBeVisible();

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
    const rendered = renderQuestion({
      question: {
        ...question,
        prompt: { kind: 'text', text: 'Which Pokémon has the lowest Speed?' },
        visual: {
          direction: 'lowest',
          kind: 'stat-showdown',
          stat: 'speed',
        },
      },
    });

    expect(
      rendered.container.querySelector('.question__instruction'),
    ).toHaveTextContent('Which Pokémon has the lowest stat?');
    expect(
      rendered.container.querySelector('.question-visual__stat'),
    ).toHaveTextContent('Speed');
    expect(
      rendered.container.querySelector('.question-visual__stat svg'),
    ).toBeInTheDocument();
    expect(screen.getByText('Which Pokémon has the lowest Speed?')).toHaveClass(
      'visually-hidden',
    );
  });

  it.each(['Mew', 'Pikachu'])(
    'reveals every Stat Showdown value after choosing %s',
    (choice) => {
      const rendered = renderQuestion({
        question: {
          ...question,
          answer: { correctOptions: ['mew'], interaction: 'single-choice' },
          optionStats: { ditto: 48, eevee: 55, mew: 100, pikachu: 90 },
          optionVisuals: Object.fromEntries(
            question.options.map((option, index) => [
              option,
              {
                dexNumber: index + 1,
                src: `https://example.com/${option}.png`,
                types: ['normal'],
              },
            ]),
          ),
          visual: {
            direction: 'highest',
            kind: 'stat-showdown',
            stat: 'speed',
          },
        },
      });

      expect(
        rendered.container.querySelectorAll('.answer__stat--reserved'),
      ).toHaveLength(4);
      expect(screen.getByRole('button', { name: 'Pikachu' })).toBeEnabled();

      fireEvent.click(screen.getByRole('button', { name: choice }));

      expect(
        rendered.container.querySelectorAll('.answer__stat--reserved'),
      ).toHaveLength(0);
      expect(
        screen.getByRole('button', { name: 'Mew. Speed: 100.' }),
      ).toHaveClass('answer--correct');
      for (const [name, value] of [
        ['Pikachu', 90],
        ['Eevee', 55],
        ['Ditto', 48],
        ['Mew', 100],
      ] as const) {
        const answer = screen.getByRole('button', {
          name: `${name}. Speed: ${value}.`,
        });
        expect(answer).toBeDisabled();
        expect(answer.querySelector('.answer__stat')).toHaveTextContent(
          String(value),
        );
        expect(answer.querySelector('.answer__stat')).toBeVisible();
      }
      expect(rendered.container.querySelectorAll('.answer__stat')).toHaveLength(
        4,
      );
    },
  );

  it('reveals the attacking Pokémon in Counter Pick', () => {
    const rendered = renderQuestion({
      question: {
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
      },
    });

    expect(screen.getByText('×2')).toBeVisible();
    expect(screen.getByText('No. 0007')).toBeVisible();
    expect(
      rendered.container.querySelector(
        '.question-relation--matchup > .question-visual__pokemon-slot img',
      ),
    ).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Pikachu' }));

    expect(
      rendered.container.querySelector(
        '.question-relation--matchup > .question-visual__pokemon-slot img[src="https://example.com/pikachu.png"]',
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

    const rendered = renderQuestion({
      question: {
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
      },
    });

    expect(screen.getByText('?')).toBeVisible();
    expect(screen.getByText('No. 0095')).toBeVisible();
    expect(screen.queryByText('No. 0208')).not.toBeVisible();
    expect(screen.queryByText('Steelix')).not.toBeVisible();
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
    renderQuestion({
      question: {
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
      },
    });

    const sprite = screen.getByRole('img', { name: /silhouette/ });
    expect(sprite).toHaveClass('sprite--silhouette');

    fireEvent.click(screen.getByRole('button', { name: 'Pikachu' }));

    expect(sprite).not.toHaveClass('sprite--silhouette');
  });

  it('ignores answer shortcuts while settings are open', () => {
    renderQuestion({ interactionPaused: true });

    fireEvent.keyDown(window, { key: '1' });

    expect(screen.getByRole('button', { name: 'Pikachu' })).toBeEnabled();
  });

  it('keeps answer feedback visual and assistive-only', () => {
    renderQuestion({
      elapsedMilliseconds: 3_000,
      elapsedSeconds: 3,
      onFeedbackStart: () => 3_000,
    });
    const answer = screen.getByRole('button', { name: 'Pikachu' });
    fireEvent.click(answer);

    expect(answer).toHaveClass('answer--correct');
    expect(answer.querySelector('kbd svg')).toBeInTheDocument();
    expect(screen.getByText('Correct.')).toHaveClass('visually-hidden');
    expect(
      screen.queryByRole('button', { name: /points/ }),
    ).not.toBeInTheDocument();
    expect(document.querySelector('.answer-explanation')).toBeNull();
  });

  it('marks both the chosen wrong answer and the correct answer without color', () => {
    renderQuestion();

    const wrong = screen.getByRole('button', { name: 'Eevee' });
    const correct = screen.getByRole('button', { name: 'Pikachu' });
    fireEvent.click(wrong);

    expect(wrong).toHaveClass('answer--wrong');
    expect(wrong.querySelector('kbd svg')).toBeInTheDocument();
    expect(correct).toHaveClass('answer--correct');
    expect(correct.querySelector('kbd svg')).toBeInTheDocument();
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

    renderQuestion({
      elapsedMilliseconds: 1_000,
      elapsedSeconds: 1,
      mode,
      number,
      onAnswer,
      onAnswerRecorded,
      onFeedbackStart,
      total,
    });

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

  it('keeps the 300 ms automatic advance in Instant mode', () => {
    vi.useFakeTimers();
    const onAnswer = vi.fn();

    renderQuestion({
      elapsedMilliseconds: 1_000,
      elapsedSeconds: 1,
      onAnswer,
      onFeedbackStart: () => 5_000,
      answerFlow: 'instant',
    });

    fireEvent.click(screen.getByRole('button', { name: 'Pikachu' }));
    expect(screen.queryByRole('button', { name: 'Next question' })).toBeNull();
    expect(
      document.querySelector('.question__action-slot'),
    ).toBeInTheDocument();
    vi.advanceTimersByTime(299);
    expect(onAnswer).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onAnswer).toHaveBeenCalledOnce();
    vi.useRealTimers();
  });

  it('checks every selected answer in a multi-select question', () => {
    renderQuestion({
      question: {
        ...question,
        answer: {
          correctOptions: ['pikachu', 'eevee'],
          interaction: 'multi-select',
        },
      },
    });

    const check = screen.getByRole('button', { name: 'Check answers' });
    expect(check).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Pikachu' }));
    fireEvent.click(screen.getByRole('button', { name: 'Eevee' }));
    expect(check).toBeEnabled();
    fireEvent.keyDown(window, { key: 'Enter' });

    expect(screen.getByRole('button', { name: 'Pikachu' })).toHaveClass(
      'answer--correct',
    );
    expect(screen.getByRole('button', { name: 'Eevee' })).toHaveClass(
      'answer--correct',
    );
    expect(screen.getByText('Correct.')).toHaveClass('visually-hidden');
  });

  it('distinguishes wrong picks from missed correct multi-select answers', () => {
    renderQuestion({
      question: {
        ...question,
        answer: {
          correctOptions: ['pikachu', 'eevee'],
          interaction: 'multi-select',
        },
      },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Pikachu' }));
    fireEvent.click(screen.getByRole('button', { name: 'Ditto' }));
    fireEvent.click(screen.getByRole('button', { name: 'Check answers' }));

    const wrongPick = screen.getByRole('button', {
      name: 'Ditto Wrong pick.',
    });
    const missed = screen.getByRole('button', {
      name: 'Eevee Correct answer, not selected.',
    });
    expect(
      wrongPick.querySelector('.answer__result-marker--wrong'),
    ).toHaveTextContent('Wrong pick');
    expect(
      missed.querySelector('.answer__result-marker--missed'),
    ).toHaveTextContent('Missed');
  });

  it('reveals reverse-silhouette choices after an answer', () => {
    renderQuestion({
      question: {
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
      },
    });

    expect(screen.queryByText('Pikachu')).not.toBeVisible();
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
    renderQuestion({
      question: {
        ...question,
        prompt: {
          after: '',
          before: 'Find ',
          dexNumber: 25,
          kind: 'pokemon',
          name: 'pikachu',
        },
        questionType: 'silhouette-match',
      },
    });

    expect(screen.getByText('(No. 0025)')).toBeVisible();
  });

  it('reveals the full sprite after a pixel peek answer', () => {
    const rendered = renderQuestion({
      question: {
        ...question,
        media: {
          focusX: 25,
          focusY: 75,
          kind: 'pixel-peek',
          src: 'https://example.com/pikachu.png',
        },
      },
    });

    expect(rendered.container.querySelector('.pixel-peek')).not.toHaveClass(
      'pixel-peek--revealed',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Pikachu' }));
    expect(rendered.container.querySelector('.pixel-peek')).toHaveClass(
      'pixel-peek--revealed',
    );
  });

  it('shows Pokédex numbers in Champion search suggestions', () => {
    renderQuestion({
      mode: { date: '2026-09-03', kind: 'daily' },
      number: 5,
      onFeedbackStart: () => 1_000,
      question: championQuestion,
      total: 5,
    });

    fireEvent.change(screen.getByRole('combobox', { name: 'Your answer' }), {
      target: { value: 'pika' },
    });

    expect(screen.getByRole('option', { name: 'Pikachu' })).toBeVisible();
    expect(screen.getByText('No. 0025')).toBeVisible();
  });

  it('starts the Champion question as a keyboard-operable autocomplete', () => {
    const onAnswer = vi.fn();
    renderQuestion({
      mode: { date: '2026-09-03', kind: 'daily' },
      number: 5,
      onAnswer,
      onFeedbackStart: () => 1_000,
      question: championQuestion,
      total: 5,
    });

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
    renderQuestion({
      mode: { date: '2026-09-03', kind: 'daily' },
      number: 5,
      onAnswer,
      onFeedbackStart: () => 1_000,
      question: championQuestion,
      total: 5,
    });

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
    renderQuestion({
      mode: { kind: 'league' },
      number: 15,
      onAnswer,
      onFeedbackStart: () => 1_000,
      question: championQuestion,
      total: 15,
    });

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

it.each(['Ivysaur', 'Bayleef'])(
  'renders Evolution link portraits with text-only choices before and after choosing %s',
  (answer) => {
    const { container } = renderQuestion({
      question: {
        ...question,
        answer: { correctOptions: ['ivysaur'], interaction: 'single-choice' },
        category: 'evolution',
        options: ['ivysaur', 'bayleef', 'grovyle', 'gloom'],
        pokemonName: 'ivysaur',
        prompt: {
          kind: 'text',
          text: 'Complete the evolution chain: Bulbasaur → ? → Venusaur.',
        },
        questionType: 'evolution-link',
        title: 'Evolution link',
        visual: {
          kind: 'evolution-link',
          before: 'bulbasaur',
          after: 'venusaur',
          stages: Object.fromEntries(
            ['bulbasaur', 'ivysaur', 'venusaur'].map((name, index) => [
              name,
              {
                dexNumber: index + 1,
                src: `/sprites/pokemon/${index + 1}.png`,
                types: ['grass', 'poison'],
              },
            ]),
          ),
        },
      },
    });
    const chain = container.querySelector('.question-evolution-link');
    expect(chain).toHaveAttribute('aria-hidden', 'true');
    expect(chain?.querySelectorAll('img')).toHaveLength(2);
    expect(chain?.querySelectorAll('.question-relation__arrow')).toHaveLength(
      2,
    );
    expect(
      container.querySelector('.answers')?.querySelectorAll('img'),
    ).toHaveLength(0);
    const hiddenIdentity = chain?.querySelectorAll('.pokemon-identity')[1];
    expect(hiddenIdentity).not.toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: answer }));
    expect(chain?.querySelectorAll('img')).toHaveLength(3);
    expect(hiddenIdentity).toBeVisible();
    expect(hiddenIdentity).toHaveTextContent('Ivysaur');
    expect(
      container.querySelector('.answers')?.querySelectorAll('img'),
    ).toHaveLength(0);
  },
);

it.each([
  ['pikachu', 'eevee'],
  ['pikachu', 'chikorita'],
])('reveals all generations after a roundup submission %j', (...selected) => {
  const options = ['pikachu', 'eevee', 'chikorita', 'mareep'];
  const optionGenerations = {
    pikachu: 'I',
    eevee: 'I',
    chikorita: 'II',
    mareep: 'II',
  } as const;
  const { container } = renderQuestion({
    question: {
      ...question,
      answer: {
        correctOptions: ['pikachu', 'eevee'],
        interaction: 'multi-select',
      },
      category: 'identity',
      options,
      optionGenerations,
      optionVisuals: Object.fromEntries(
        options.map((name, index) => [
          name,
          { src: `/sprites/${name}.png`, dexNumber: index + 1, types: [] },
        ]),
      ),
      prompt: {
        kind: 'text',
        text: 'Select every Pokémon introduced in Generation I.',
      },
      questionType: 'generation-roundup',
      title: 'Generation roundup',
    },
  });
  expect(container.querySelectorAll('.pokemon-identity__number')).toHaveLength(
    0,
  );
  expect(
    container.querySelectorAll('.answer__generation--reserved'),
  ).toHaveLength(4);
  for (const option of selected)
    fireEvent.click(
      screen.getByRole('button', {
        name: option[0]!.toUpperCase() + option.slice(1),
      }),
    );
  fireEvent.click(screen.getByRole('button', { name: 'Check answers' }));
  expect(
    container.querySelectorAll('.answer__generation--reserved'),
  ).toHaveLength(0);
  for (const [name, generation] of Object.entries(optionGenerations)) {
    expect(
      screen.getByRole('button', {
        name: new RegExp(`${name}.*Generation ${generation}\\.`, 'i'),
      }),
    ).toBeDisabled();
  }
});

it('does not announce a missing Pokémon for an exact Champion answer', () => {
  renderQuestion({ question: championQuestion });
  const input = screen.getByRole('combobox', { name: 'Your answer' });
  fireEvent.change(input, { target: { value: 'Pikachu' } });
  expect(screen.queryByText('No Pokémon found')).not.toBeInTheDocument();
  expect(input).toHaveAttribute('aria-expanded', 'false');
  expect(input).not.toHaveAttribute('aria-controls');
  expect(screen.getByRole('button', { name: 'Guess' })).toBeEnabled();
  fireEvent.change(input, { target: { value: 'zzzzzz' } });
  expect(screen.getByText('No Pokémon found')).toBeVisible();
  expect(screen.getByRole('button', { name: 'Guess' })).toBeDisabled();
});
