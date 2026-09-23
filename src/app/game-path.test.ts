import { expect, test } from 'vitest';
import { isGamePath } from './game-path';
import { accountReturnPath } from '../features/account/account-navigation';
import { parseFriendInput } from '../domain/social/friends';
import { parseDailyDate, shouldAutoStartDaily } from '../domain/quiz/daily';

test('shared game links load the app and retain their destination after sign-in', () => {
  const paths = [
    '/',
    '/trainer/edit',
    '/league/challenge',
    '/league/hall-of-fame',
    '/social/friends',
    '/social/players/123',
    '/daily/2026-09-23',
  ];
  for (const path of paths) {
    expect(isGamePath(path)).toBe(true);
    expect(
      accountReturnPath(
        `https://quizmon.test/account?returnTo=${encodeURIComponent(path)}`,
      ),
    ).toBe(path);
  }
  expect(isGamePath('/daily/2026-02-30')).toBe(false);
  expect(isGamePath('/missing')).toBe(false);
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
});
