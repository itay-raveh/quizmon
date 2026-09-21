import { render, screen } from '@testing-library/react';
import { createQuestionContext } from '../../../tests/fixtures/catalog';
import { buildQuestionType } from '@/domain/quiz/questions/registry';
import {
  getQuestionRendering,
  questionVariants,
} from '@/domain/quiz/question-variants';
import { isQuestionData } from '@/domain/quiz/question-lineup';
import { QuestionAnswers } from './QuestionAnswers';
import { QuestionArtwork } from './QuestionArtwork';
import { QuestionIdentity } from './QuestionEntity';
import type { QuestionData } from '@/domain/quiz/types';

it('snapshots a grid override and applies independent visibility before and after an answer', () => {
  const previous = questionVariants['type-twins'];
  let question: QuestionData;
  try {
    questionVariants['type-twins'] = {
      ...previous,
      5: {
        rendering: {
          subject: { sprite: 'after-answer', number: 'never' },
          choices: {
            sprite: 'after-answer',
            number: 'always',
            name: undefined,
          },
        },
      },
    };
    const context = createQuestionContext('rendering-grid');
    context.difficulty = 5;
    const saved: unknown = JSON.parse(
      JSON.stringify(buildQuestionType(context, 'type-twins')),
    );
    if (!isQuestionData(saved))
      throw new Error('Invalid saved rendering policy');
    question = saved;
  } finally {
    questionVariants['type-twins'] = previous;
  }
  expect(isQuestionData(question)).toBe(true);
  expect(
    isQuestionData({
      ...question,
      rendering: {
        ...question.rendering,
        choices: { sprite: 'sometimes', name: 'always', number: 'always' },
      },
    }),
  ).toBe(false);
  expect(getQuestionRendering(question).subject.number).toBe('never');
  const content = (answered: boolean) => (
    <>
      <QuestionArtwork question={question} answered={answered} cluesShown={0} />
      <QuestionAnswers
        question={question}
        answered={answered}
        selectedOptions={[]}
        onSelect={() => {}}
      />
    </>
  );
  const { container, rerender } = render(content(false));
  for (const sprite of container.querySelectorAll('.pixel-sprite'))
    expect(sprite).not.toBeVisible();
  for (const number of container.querySelectorAll(
    '.answer .pokemon-identity__number',
  ))
    expect(number).toBeVisible();
  expect(
    container.querySelector('.question-visual__subject-number'),
  ).not.toBeInTheDocument();
  rerender(content(true));
  for (const sprite of container.querySelectorAll('.pixel-sprite'))
    expect(sprite).toBeVisible();
  expect(
    container.querySelector('.question-visual__subject-number'),
  ).not.toBeInTheDocument();
});

it('does not couple a visible number to a hidden name', () => {
  render(
    <QuestionIdentity
      name="pikachu"
      dexNumber={25}
      policy={{ sprite: 'never', name: 'after-answer', number: 'always' }}
      state={{ answered: false, cluesShown: 0 }}
    />,
  );
  expect(screen.getByText('No. 0025')).toBeVisible();
  expect(screen.getByText('Pikachu')).not.toBeVisible();
});

it('uses clue thresholds for choices and removes the silhouette on reveal', () => {
  const context = createQuestionContext('clue-rendering');
  const question = buildQuestionType(context, 'sprite-match')!;
  question.rendering = {
    ...getQuestionRendering(question),
    choices: {
      sprite: { afterClues: 2, silhouette: true },
      name: 'after-answer',
      number: 'after-answer',
    },
  };
  const content = (cluesShown: number, answered = false) => (
    <QuestionAnswers
      question={question}
      answered={answered}
      cluesShown={cluesShown}
      selectedOptions={[]}
      onSelect={() => {}}
    />
  );
  const { container, rerender } = render(content(1));
  for (const sprite of container.querySelectorAll('.pixel-sprite'))
    expect(sprite).not.toBeVisible();
  rerender(content(2));
  for (const sprite of container.querySelectorAll('.pixel-sprite')) {
    expect(sprite).toBeVisible();
    expect(sprite).toHaveClass('answer__sprite--silhouette');
  }
  rerender(content(2, true));
  expect(container.querySelector('.answer__sprite--silhouette')).toBeNull();
});
