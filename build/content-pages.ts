import { readFileSync } from 'node:fs';
import { Marked } from 'marked';
import { contentPages } from '../src/app/content-pages.ts';
import { site } from '../src/app/site.ts';

const markdown = new Marked({
  walkTokens(token) {
    if (token.type !== 'link') return;
    const page = contentPages.find(({ source }) => source === token.href);
    if (page) token.href = page.path;
    if (token.href === '../LICENSE') {
      token.href = `${site.repositoryUrl}/blob/main/LICENSE`;
    }
  },
});

const layout = (content: string) =>
  readFileSync(new URL('./content-page.html', import.meta.url), 'utf8').replace(
    '<!-- content -->',
    content,
  );

export const contentPageEntries = [
  ...contentPages.map(({ path }) => `${path.slice(1)}.html`),
  '404.html',
];

export const renderContentPage = (path: string) => {
  if (path === '/404.html') {
    return {
      path,
      title: 'Page Not Found',
      description: undefined,
      noindex: true as const,
      html: layout(
        readFileSync(new URL('./404.html', import.meta.url), 'utf8'),
      ),
    };
  }

  const page = contentPages.find((page) => `${page.path}.html` === path);
  if (!page) return;

  const source = readFileSync(
    new URL(`../content/${page.source}`, import.meta.url),
    'utf8',
  );
  const links = contentPages
    .map(
      ({ path, label }) =>
        `<a href="${path}"${path === page.path ? ' aria-current="page"' : ''}>${label}</a>`,
    )
    .join('\n');

  return {
    ...page,
    noindex: false as const,
    html: layout(`<header class="legal-header">
      <nav aria-label="Site"><a href="/">Back to Quizmon</a>${links}</nav>
    </header>
    <main class="legal-content${page.path === '/about' ? ' about-content' : ''}">${markdown.parse(source, { async: false })}</main>`),
  };
};
