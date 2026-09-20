import { readFileSync } from 'node:fs';
import { Marked } from 'marked';
import { CoffeeIcon } from '@phosphor-icons/react/ssr';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  contentPages,
  footerCredits,
  footerDisclaimer,
  footerLinks,
} from '../src/app/content-pages.ts';
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

const credit = ({ label, name, href }: (typeof footerCredits)[number]) =>
  `<span>${label} <a href="${href}" target="_blank" rel="noreferrer">${name}</a></span>`;
const coffeeIcon = renderToStaticMarkup(
  createElement(CoffeeIcon, { size: 22, weight: 'bold', 'aria-hidden': true }),
);

const footer = (currentPath?: string) => `<footer class="site-footer">
  <div class="site-footer__support-row">
    <a class="site-footer__support" href="${site.supportUrl}" target="_blank" rel="noopener" referrerpolicy="origin">${coffeeIcon}Buy me a coffee</a>
  </div>
  <div class="site-footer__people">
    <span>© ${new Date().getFullYear()} <a href="${site.authorUrl}" target="_blank" rel="noreferrer">${site.authorName}</a></span>
    <a href="mailto:${site.contactEmail}">Contact</a>
  </div>
  <nav class="site-footer__links" aria-label="Help and information">
    ${footerLinks.map(({ href, label, ...link }) => `<a href="${href}"${href === currentPath ? ' aria-current="page"' : ''}${'external' in link && link.external ? ' target="_blank" rel="noreferrer"' : ''}>${label}</a>`).join('')}
  </nav>
  <div class="site-footer__credits">
    ${footerCredits.map(credit).join('')}
  </div>
  <p class="site-footer__disclaimer">${footerDisclaimer}</p>
</footer>`;

const layout = (content: string, currentPath?: string) =>
  readFileSync(new URL('./content-page.html', import.meta.url), 'utf8')
    .replace(
      '</head>',
      '<link rel="stylesheet" href="/src/app/footer.css" /></head>',
    )
    .replace('<!-- content -->', `${content}${footer(currentPath)}`);

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

  return {
    ...page,
    noindex: false as const,
    html: layout(
      `<header class="legal-header">
      <nav aria-label="Site"><a href="/">Back to Quizmon</a></nav>
    </header>
    <main class="legal-content${page.path === '/about' ? ' about-content' : ''}">${markdown.parse(source, { async: false })}</main>`,
      page.path,
    ),
  };
};
