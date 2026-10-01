import { expect, test } from 'vitest';
import { isAppPath } from './app-path';
import { accountReturnPath } from '../features/account/account-navigation';

test('account return links accept valid app paths and reject external or invalid paths', () => {
  const returnTo = '/account/friends?id=trainer_a';
  expect(
    accountReturnPath(
      `https://quizmon.test/account?returnTo=${encodeURIComponent(returnTo)}`,
    ),
  ).toBe(returnTo);
  expect(accountReturnPath(`https://quizmon.test${returnTo}`)).toBe(returnTo);
  expect(
    accountReturnPath(
      'https://quizmon.test/account?returnTo=https://evil.test/',
    ),
  ).toBe('/');
  expect(
    accountReturnPath('https://quizmon.test/account?returnTo=/api/account'),
  ).toBe('/');
  expect(isAppPath('/daily/2026-02-30')).toBe(false);
  expect(isAppPath('/daily/2026-09-23')).toBe(true);
});
