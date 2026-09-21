import { renderToStaticMarkup } from 'react-dom/server';
import { expect, test } from 'vitest';
import { SocialSections } from './SocialSections';

test('Rankings and Friends are peer sections with one current page', () => {
  const rankings = renderToStaticMarkup(
    <SocialSections active="rankings" onFriends={() => {}} />,
  );
  const friends = renderToStaticMarkup(
    <SocialSections active="friends" onRankings={() => {}} />,
  );

  for (const markup of [rankings, friends]) {
    expect(markup).toContain('aria-label="Social sections"');
    expect(markup).toContain('Rankings');
    expect(markup).toContain('Friends');
    expect(markup.match(/aria-current="page"/g)).toHaveLength(1);
  }
  expect(rankings).toMatch(/aria-current="page"[^>]*>Rankings/);
  expect(friends).toMatch(/aria-current="page"[^>]*>Friends/);
});
