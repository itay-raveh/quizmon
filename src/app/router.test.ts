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

test('rankings discards invalid query values', () => {
  expect(matchUrl('/rankings?scope=invalid&date=2026-02-30')?.search).toEqual({
    date: undefined,
    scope: undefined,
  });
  expect(matchUrl('/rankings?date=9999-12-31')?.search).toEqual({
    date: undefined,
  });
});
