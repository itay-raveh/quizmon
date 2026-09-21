import { renderToStaticMarkup } from 'react-dom/server';
import { expect, test, vi } from 'vitest';
import { FriendsPanel } from './FriendsPanel';

test('initial loading shows friend-list rows instead of a text placeholder', () => {
  vi.stubGlobal('location', new URL('https://quizmon.test'));
  try {
    const markup = renderToStaticMarkup(
      <FriendsPanel owner="trainer" initialInput="" adding={false} />,
    );
    expect(markup).toContain('class="friends-loading"');
    expect(markup.match(/<li>/g)).toHaveLength(3);
    expect(markup).toContain('Loading friends');
  } finally {
    vi.unstubAllGlobals();
  }
});

test('opening a friend link does not offer an automatic request', () => {
  vi.stubGlobal('location', new URL('https://quizmon.test'));
  try {
    const markup = renderToStaticMarkup(
      <FriendsPanel owner="trainer" initialInput="AABBCCDDEEFF0011" adding />,
    );
    expect(markup).toContain('It does not send a request');
    expect(markup).not.toContain('Copy my link');
    expect(markup).not.toContain('Send friend request');
  } finally {
    vi.unstubAllGlobals();
  }
});
