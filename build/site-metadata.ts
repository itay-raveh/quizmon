import type { HtmlTagDescriptor, Plugin } from 'vite';
import { site } from '../src/app/site.ts';

const absoluteUrl = (path: string) => new URL(path, site.url).href;

const manifest = `${JSON.stringify(
  {
    id: '/',
    name: site.name,
    short_name: site.name,
    description: site.description,
    start_url: '/',
    scope: '/',
    icons: [
      {
        src: '/android-chrome-192x192.png',
        sizes: '192x192',
        type: 'image/png',
      },
    ],
    theme_color: site.themeColor,
    background_color: site.themeColor,
    display: 'standalone',
  },
  null,
  2,
)}\n`;

const meta = (
  attribute: 'name' | 'property',
  key: string,
  content: string | number,
): HtmlTagDescriptor => ({
  tag: 'meta',
  attrs: { [attribute]: key, content: String(content) },
  injectTo: 'head',
});

const tags: HtmlTagDescriptor[] = [
  { tag: 'title', children: site.name, injectTo: 'head' },
  meta('name', 'description', site.description),
  meta('name', 'theme-color', site.themeColor),
  {
    tag: 'link',
    attrs: { rel: 'canonical', href: site.url },
    injectTo: 'head',
  },
  meta('property', 'og:type', 'website'),
  meta('property', 'og:site_name', site.name),
  meta('property', 'og:title', site.name),
  meta('property', 'og:description', site.description),
  meta('property', 'og:url', site.url),
  meta('property', 'og:locale', site.locale),
  meta('property', 'og:image', absoluteUrl(site.socialImage.path)),
  meta('property', 'og:image:type', site.socialImage.type),
  meta('property', 'og:image:width', site.socialImage.width),
  meta('property', 'og:image:height', site.socialImage.height),
  meta('property', 'og:image:alt', site.socialImage.alt),
  meta('name', 'twitter:card', 'summary_large_image'),
];

export const siteMetadata = (): Plugin => ({
  name: 'quizmon-site-metadata',
  configureServer(server) {
    server.middlewares.use((request, response, next) => {
      if (request.url?.split('?')[0] !== '/site.webmanifest') {
        next();
        return;
      }

      response.statusCode = 200;
      response.setHeader('Content-Type', 'application/manifest+json');
      response.end(manifest);
    });
  },
  generateBundle() {
    this.emitFile({
      type: 'asset',
      fileName: 'site.webmanifest',
      source: manifest,
    });
  },
  transformIndexHtml(html) {
    return {
      html: html.replace('<html>', `<html lang="${site.language}">`),
      tags,
    };
  },
});
