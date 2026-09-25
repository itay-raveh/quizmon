import { renderToStaticMarkup } from 'react-dom/server';
import { expect, test } from 'vitest';
import { RoundProgress } from './RoundProgress';

test('shows two-digit question progress without a duplicate track', () => {
  const markup = renderToStaticMarkup(<RoundProgress current={2} total={10} />);

  expect(markup).toContain('02 / 10');
  expect(markup).toContain('aria-valuenow="2"');
  expect(markup).toContain('aria-valuetext="Question 2 of 10"');
  expect(markup).not.toContain('progress__track');
});
