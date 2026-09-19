import { describe, expect, it } from 'vitest';
import { accountReturnPath } from './account-navigation';

describe('returning after sign-in', () => {
  const accountUrl = (returnTo: string) =>
    `https://quizmon.test/?screen=account&returnTo=${encodeURIComponent(returnTo)}`;

  it('retains the Daily date and friend filter across the account reload', () => {
    expect(
      accountReturnPath(
        accountUrl(
          '/?screen=leaderboards&standings=2026-09-17&players=friends',
        ),
      ),
    ).toBe('/?screen=leaderboards&standings=2026-09-17&players=friends');
  });

  it('retains an invitation through sign-in', () => {
    expect(accountReturnPath(accountUrl('/#friend=abcd1234abcd1234'))).toBe(
      '/#friend=abcd1234abcd1234',
    );
  });

  it('rejects external redirects and loops to the sign-in screen', () => {
    for (const target of [
      'https://example.com/',
      '//example.com/',
      '/?screen=account',
      '/api/account',
      'javascript:alert(1)',
    ])
      expect(accountReturnPath(accountUrl(target))).toBe('/');
  });

  it('preserves a direct friend invitation without a return target', () => {
    expect(
      accountReturnPath(
        'https://quizmon.test/?screen=account#friend=abcd1234abcd1234',
      ),
    ).toBe('/#friend=abcd1234abcd1234');
  });
});
