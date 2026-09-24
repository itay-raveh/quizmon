import { renderToStaticMarkup } from 'react-dom/server';
import { expect, test, vi } from 'vitest';
import { FriendsPanel } from './FriendsPanel';

test('initial friend-link view shows the manual-request disclaimer', () => {
  vi.stubGlobal('location', new URL('https://quizmon.test'));
  try {
    const markup = renderToStaticMarkup(
      <FriendsPanel
        owner="trainer"
        initialInput="AABBCCDDEEFF0011"
        adding
        onToggleAdding={() => {}}
      />,
    );
    expect(markup).toContain('It does not send a request');
    expect(markup).not.toContain('Copy my link');
    expect(markup).not.toContain('Send friend request');
  } finally {
    vi.unstubAllGlobals();
  }
});
