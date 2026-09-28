import { readFileSync } from 'node:fs';
import { Marked } from 'marked';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { staticPages } from '../src/app/static-pages.ts';
import { site } from '../src/app/site.ts';

const markdown = new Marked({
  walkTokens(token) {
    if (token.type !== 'link') return;
    const page = staticPages.find(({ source }) => source === token.href);
    if (page) token.href = page.path;
    if (token.href === '../LICENSE')
      token.href = `${site.repositoryUrl}/blob/main/LICENSE`;
    if (token.href === '../NOTICE')
      token.href = `${site.repositoryUrl}/blob/main/NOTICE`;
  },
});

const layout = async (content: string, currentPath?: string) => {
  const { Footer } = await import('../src/app/Footer.tsx');
  return readFileSync(new URL('./content-page.html', import.meta.url), 'utf8')
    .replace(
      '</head>',
      '<link rel="stylesheet" href="/src/app/footer.css" /></head>',
    )
    .replace(
      '<!-- content -->',
      `${content}${renderToStaticMarkup(createElement(Footer, { currentPath }))}`,
    );
};

export const contentPageEntries = staticPages.map(
  ({ path }) => `${path.slice(1)}.html`,
);

export const renderContentPage = async (path: string) => {
  const page = staticPages.find((page) => `${page.path}.html` === path);
  if (!page) return;

  const article = page.format === 'markdown';
  const source = readFileSync(
    new URL(
      article ? `../content/${page.source}` : page.source,
      import.meta.url,
    ),
    'utf8',
  );

  return {
    ...page,
    html: await layout(
      article
        ? `<header class="content-page__header">
      <nav aria-label="Site"><a href="/">Back to Quizmon</a></nav>
    </header>
    <main class="content-page__content">${markdown.parse(source, { async: false })}</main>`
        : source,
      article ? page.path : undefined,
    ),
  };
};
