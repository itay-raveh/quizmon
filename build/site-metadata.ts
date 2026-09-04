import type { HtmlTagDescriptor, Plugin } from 'vite';
import { absoluteSiteUrl, site } from '../src/app/site.ts';
import {
  generatedAssets,
  llmsUrl,
  markdownUrl,
  structuredData,
} from './site-assets.ts';

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
  { tag: 'title', children: site.title, injectTo: 'head' },
  meta('name', 'description', site.description),
  meta('name', 'theme-color', site.themeColor),
  {
    tag: 'link',
    attrs: { rel: 'canonical', href: site.url },
    injectTo: 'head',
  },
  {
    tag: 'link',
    attrs: { rel: 'alternate', type: 'text/markdown', href: markdownUrl },
    injectTo: 'head',
  },
  {
    tag: 'link',
    attrs: { rel: 'describedby', type: 'text/markdown', href: llmsUrl },
    injectTo: 'head',
  },
  meta('property', 'og:type', 'website'),
  meta('property', 'og:site_name', site.name),
  meta('property', 'og:title', site.title),
  meta('property', 'og:description', site.description),
  meta('property', 'og:url', site.url),
  meta('property', 'og:locale', site.locale),
  meta('property', 'og:image', absoluteSiteUrl(site.socialImage.path)),
  meta('property', 'og:image:type', site.socialImage.type),
  meta('property', 'og:image:width', site.socialImage.width),
  meta('property', 'og:image:height', site.socialImage.height),
  meta('property', 'og:image:alt', site.socialImage.alt),
  meta('name', 'twitter:card', 'summary_large_image'),
  {
    tag: 'script',
    attrs: { type: 'application/ld+json' },
    children: structuredData,
    injectTo: 'head',
  },
];

export const siteMetadata = (): Plugin => ({
  name: 'quizmon-site-metadata',
  configureServer(server) {
    server.middlewares.use((request, response, next) => {
      const path = request.url?.split('?')[0]?.slice(1);
      const asset = generatedAssets.find(({ fileName }) => fileName === path);

      if (!asset) {
        next();
        return;
      }

      response.statusCode = 200;
      response.setHeader('Content-Type', asset.contentType);
      response.end(asset.source);
    });
  },
  generateBundle() {
    for (const asset of generatedAssets) {
      this.emitFile({
        type: 'asset',
        fileName: asset.fileName,
        source: asset.source,
      });
    }
  },
  transformIndexHtml(html) {
    return {
      html: html
        .replace('<html>', `<html lang="${site.language}">`)
        .replace(
          '<div id="root"></div>',
          `<div id="root"><h1 id="landing-title" class="visually-hidden">${site.title}</h1></div>`,
        ),
      tags,
    };
  },
});
