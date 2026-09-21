import { expect, test } from 'vitest';
import { evolutionChoiceDetails } from './evolution-presentation.ts';

test('evolution choices share only common requirements', () => {
  const details = evolutionChoiceDetails([
    'Level Up · during the day · at level 20',
    'Level Up · during the day · at level 25',
    'Level Up · during the day · at level 30',
  ]);
  expect(details.shared).toEqual(['Level Up', 'during the day']);
  expect(details.missing).toEqual([
    ['at level 20'],
    ['at level 25'],
    ['at level 30'],
  ]);
});
