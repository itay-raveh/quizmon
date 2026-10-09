import { expect, it } from 'vitest';
import { formatQuestionUnavailableReason as format } from './question-availability';

it('describes inherited, bounded and disjoint level ranges without implying gaps are available', () => {
  expect(format({ kind: 'levels', levels: [4, 5] })).toBe(
    'Available from Level 4',
  );
  expect(format({ kind: 'levels', levels: [1, 2, 3] })).toBe(
    'Available up to Level 3',
  );
  expect(format({ kind: 'levels', levels: [2, 3] })).toBe(
    'Available at Levels 2–3',
  );
  expect(format({ kind: 'levels', levels: [2, 4, 5] })).toBe(
    'Available at Levels 2 or 4–5',
  );
  expect(format({ kind: 'levels', levels: [3] })).toBe('Available at Level 3');
});
