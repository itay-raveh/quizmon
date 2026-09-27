import { renderToStaticMarkup } from 'react-dom/server';
import { QueryClientProvider } from '@tanstack/react-query';
import { expect, test, vi } from 'vitest';
import { queryClient } from '../../lib/query-client';
import { FriendsPanel } from './FriendsPanel';

test('initial friend-link view shows the manual-request disclaimer', () => {
  vi.stubGlobal('location', new URL('https://quizmon.test'));
  try {
    const markup = renderToStaticMarkup(
      <QueryClientProvider client={queryClient}>
        <FriendsPanel
          owner="trainer"
          initialInput="AABBCCDDEEFF0011"
          adding
          onToggleAdding={() => {}}
        />
      </QueryClientProvider>,
    );
    expect(markup).toContain('It does not send a request');
    expect(markup).not.toContain('Copy invite link');
    expect(markup).not.toContain('Send friend request');
  } finally {
    vi.unstubAllGlobals();
  }
});

test('the friends page leads with a link invitation, not code search', () => {
  vi.stubGlobal('location', new URL('https://quizmon.test'));
  try {
    const markup = renderToStaticMarkup(
      <QueryClientProvider client={queryClient}>
        <FriendsPanel
          owner="trainer"
          initialInput=""
          adding={false}
          onToggleAdding={() => {}}
        />
      </QueryClientProvider>,
    );
    expect(markup).toContain('Copy invite link');
    expect(markup).not.toContain('Find a Trainer');
    expect(markup).not.toContain('Their friend code or link');
  } finally {
    vi.unstubAllGlobals();
  }
});
