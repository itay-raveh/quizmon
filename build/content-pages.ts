import { readFileSync } from 'node:fs';
import { Marked } from 'marked';
import { site } from '../src/app/site.ts';

export const contentPages = [
  {
    path: '/about',
    label: 'How to play',
    title: 'About & How to Play',
    description:
      'Learn how Quizmon’s Daily Challenge, Training, scores, badges, and Pokémon League work, and how your progress is saved.',
    source: 'about.md',
  },
  {
    path: '/privacy',
    label: 'Privacy',
    title: 'Privacy and Cookies',
    description:
      'How Quizmon handles game analytics, optional reminders, browser storage, and your privacy choices.',
    source: 'privacy.md',
  },
  {
    path: '/terms',
    label: 'Terms',
    title: 'Terms of Use',
    description:
      'Terms for playing Quizmon, including acceptable use, saved progress, open-source licensing, and artwork credits.',
    source: 'terms.md',
  },
];

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
