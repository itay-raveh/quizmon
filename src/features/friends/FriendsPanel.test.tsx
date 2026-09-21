import { renderToStaticMarkup } from 'react-dom/server';
import { expect, test, vi } from 'vitest';
import { FriendsPanel } from './FriendsPanel';

test('initial loading shows friend-list rows instead of a text placeholder', () => {
  vi.stubGlobal('location', new URL('https://quizmon.test'));
  try {
    const markup = renderToStaticMarkup(
      <FriendsPanel owner="trainer" initialInput="" />,
    );
    expect(markup).toContain('class="friends-loading"');
    expect(markup.match(/<li>/g)).toHaveLength(3);
    expect(markup).toContain('Loading friends');
  } finally {
    vi.unstubAllGlobals();
  }
});
