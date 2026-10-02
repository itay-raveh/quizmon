import { createMemoryHistory, createRouter } from '@tanstack/react-router';
import { expect, test } from 'vitest';
import { routeTree } from '../routeTree.gen';

const matchUrl = (url: string) => {
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [url] }),
  });
  return router.matchRoutes(router.state.location).at(-1);
};

test('Daily links preserve the play flag after URL parsing', () => {
  expect(matchUrl('/daily/2026-09-23?play=1')?.search).toEqual({ play: 1 });
  expect(matchUrl('/daily/2026-09-23?play=invalid')?.search).toEqual({
    play: undefined,
  });
});

test('rankings discards invalid query values', () => {
  expect(matchUrl('/rankings?scope=invalid&date=2026-02-30')?.search).toEqual({
    date: undefined,
    scope: undefined,
  });
});
