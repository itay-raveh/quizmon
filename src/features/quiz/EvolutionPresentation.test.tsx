import { render, screen } from '@testing-library/react';
import {
  catalog,
  createQuestionContext,
} from '../../../tests/fixtures/catalog';
import { buildQuestionType } from '@/domain/quiz/questions/registry';
import { presentEvolutionQuestion } from '@/domain/quiz/questions/evolution-presentation';
import { QuestionArtwork } from './QuestionArtwork';

const evolution = (before: string, after: string, difficulty: 3 | 4) => {
  const context = createQuestionContext('evolution-presentation');
  context.pool = context.pool.filter(({ name }) =>
    [before, after].includes(name),
  );
  return buildQuestionType({ ...context, difficulty }, 'evolution-conditions')!;
};

it('reveals Amaura’s full requirement only after answering and removes redundant game context', () => {
  const generated = evolution('amaura', 'aurorus', 4);
  expect(generated).toBeDefined();
  const question = presentEvolutionQuestion(
    {
      ...generated,
      prompt: {
        kind: 'text',
        text: 'What’s the minimum evolution level?',
        supportingText: 'Pokémon Y',
      },
    },
    catalog.topics!.evolutions,
  );
  expect(question.prompt).toEqual({
    kind: 'text',
    text: 'What’s the minimum evolution level?',
  });
  expect(
    question.options.map((option) => question.optionLabels![option]),
  ).toContain('39');
  const { rerender } = render(
    <QuestionArtwork question={question} answered={false} cluesShown={0} />,
  );
  expect(
    screen.queryByLabelText('Evolution requirements'),
  ).not.toBeInTheDocument();
  expect(screen.queryByText('Level up')).not.toBeInTheDocument();
  rerender(<QuestionArtwork question={question} answered cluesShown={0} />);
  expect(screen.getByLabelText('Evolution requirements')).toHaveTextContent(
    'Level 39+ at night',
  );
});

it('keeps game context for Magneton’s game-dependent evolution requirements', () => {
  const question = evolution('magneton', 'magnezone', 3);
  expect(question).toBeDefined();
  expect(
    presentEvolutionQuestion(question, catalog.topics!.evolutions).prompt
      .supportingText,
  ).toMatch(/^Pokémon /);
});
