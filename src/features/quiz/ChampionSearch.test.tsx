import { baseQuestionRendering } from '@/domain/quiz/variants';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, test } from 'vitest';
import { ChampionSearch } from './ChampionSearch';

test('reveals the correct search answer after a wrong guess', () => {
  const props = {
    answerKind: 'ability' as const,
    policy: baseQuestionRendering.search,
    cluesShown: 0,
    correctOption: 'sticky-hold',
    disabled: false,
    onAnswer: () => {},
    options: [{ name: 'sticky-hold' }, { name: 'wonder-guard' }],
    selectedOption: 'wonder-guard',
    showCorrectAnswerBanner: true,
  };

  expect(
    renderToStaticMarkup(<ChampionSearch {...props} answered />),
  ).toContain('Correct answer: <strong>Sticky Hold</strong>');
  expect(
    renderToStaticMarkup(<ChampionSearch {...props} answered={false} />),
  ).not.toContain('Correct answer:');
  expect(
    renderToStaticMarkup(
      <ChampionSearch
        {...props}
        answered
        answerKind="pokemon"
        showCorrectAnswerBanner={false}
      />,
    ),
  ).not.toContain('Correct answer:');
});
