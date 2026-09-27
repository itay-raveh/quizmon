import { expect, test } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import { createElement } from 'react';
import { isAppPath } from './app-path';
import { useAppDestination } from './useAppDestination';
import { accountReturnPath } from '../features/account/account-navigation';
import { parseFriendInput } from '../domain/social/friends';
import { parseDailyDate, shouldAutoStartDaily } from '../domain/quiz/daily';

function Scope() {
  return createElement('span', null, useAppDestination().standingsScope);
}

test('Social standings default to friends while explicit global links remain global', () => {
  for (const [path, scope] of [
    ['/social/rankings', 'friends'],
    ['/social/rankings?scope=global', 'global'],
  ] as const) {
    expect(
      renderToStaticMarkup(
        createElement(
          MemoryRouter,
          { initialEntries: [path] },
          createElement(Scope),
        ),
      ),
    ).toContain(`<span>${scope}</span>`);
  }
});

test('shared app links load the app and retain their destination after sign-in', () => {
  const paths = [
    '/',
    '/trainer/edit',
    '/league',
    '/social/friends',
    '/social/players/123',
    '/daily/2026-09-23',
  ];
  for (const path of paths) {
    expect(isAppPath(path)).toBe(true);
    expect(
      accountReturnPath(
        `https://quizmon.test/account?returnTo=${encodeURIComponent(path)}`,
      ),
    ).toBe(path);
  }
  expect(isAppPath('/daily/2026-02-30')).toBe(false);
  expect(isAppPath('/league/hall-of-fame')).toBe(false);
  expect(isAppPath('/missing')).toBe(false);
  expect(
    accountReturnPath('https://quizmon.test/account?returnTo=/api/account'),
  ).toBe('/');
});

test('daily reminders and friend invites resolve from their new paths', () => {
  expect(parseDailyDate('/daily/2026-09-23')).toBe('2026-09-23');
  expect(shouldAutoStartDaily('/daily/2026-09-23', '?play=1')).toBe(true);
  expect(
    parseFriendInput(
      'https://quizmon.test/social/friends?code=AABBCCDDEEFF0011',
      'https://quizmon.test',
    ),
  ).toBe('AABBCCDDEEFF0011');
  expect(
    accountReturnPath(
      `https://quizmon.test/account?returnTo=${encodeURIComponent('/social/friends?code=AABBCCDDEEFF0011')}`,
    ),
  ).toBe('/social/friends?code=AABBCCDDEEFF0011');
});
