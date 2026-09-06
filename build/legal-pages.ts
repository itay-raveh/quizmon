import { readFileSync } from 'node:fs';
import { Marked } from 'marked';
import { site } from '../src/app/site.ts';

const pages = [
  {
    path: '/privacy',
    label: 'Privacy',
    title: 'Privacy and Cookies',
    source: 'PRIVACY.md',
  },
  { path: '/terms', label: 'Terms', title: 'Terms of Use', source: 'TERMS.md' },
];

const markdown = new Marked({
  walkTokens(token) {
    if (token.type !== 'link') return;
    const page = pages.find(({ source }) => source === token.href);
    if (page) token.href = page.path;
    if (token.href === 'LICENSE') {
      token.href = `${site.repositoryUrl}/blob/main/LICENSE`;
    }
  },
});

export const renderLegalPage = (path: string) => {
  const page = pages.find((page) => `${page.path}.html` === path);
  if (!page) return;

  const source = readFileSync(
    new URL(`../${page.source}`, import.meta.url),
    'utf8',
  );
  const links = pages
    .map(
      ({ path, label }) =>
        `<a href="${path}"${path === page.path ? ' aria-current="page"' : ''}>${label}</a>`,
    )
    .join('\n');

  return {
    ...page,
    html: `<header class="legal-header">
      <nav aria-label="Site"><a href="/">Back to Quizmon</a>${links}</nav>
    </header>
    <main class="legal-content">${markdown.parse(source, { async: false })}</main>`,
  };
};
