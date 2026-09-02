import { readFileSync } from 'node:fs';
import { site } from '../src/app/site.ts';

const absoluteUrl = (path: string) => new URL(path, site.url).href;

export const markdownUrl = absoluteUrl('/index.md');
export const llmsUrl = absoluteUrl('/llms.txt');
const sitemapUrl = absoluteUrl('/sitemap.xml');

const manifest = `${JSON.stringify(
  {
    id: '/',
    name: site.name,
    short_name: site.name,
    description: site.description,
    categories: ['games', 'entertainment'],
    start_url: '/',
    scope: '/',
    icons: [
      {
        src: '/pwa-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/pwa-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/pwa-maskable-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    lang: site.language,
    theme_color: site.themeColor,
    background_color: site.themeColor,
    display: 'standalone',
  },
  null,
  2,
)}\n`;

const robots = `User-agent: *
Allow: /

Sitemap: ${sitemapUrl}
`;

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${site.url}</loc>
  </url>
</urlset>
`;

const pageMarkdown = readFileSync(
  new URL('../README.md', import.meta.url),
  'utf8',
);

const llms = `# ${site.name}

> ${site.description}

Quizmon is a free, unofficial browser game. It has no accounts or application backend, and player settings and results remain on the device.

## Game

- [Quizmon overview](${markdownUrl}): Game modes, question coverage, data use, offline behavior, and attribution.
- [Play Quizmon](${site.url}): The interactive game.

## Project

- [Source repository](${site.repositoryUrl}): Source code, setup instructions, and license.
- [PokéAPI](https://pokeapi.co/): Source of Pokémon data and sprite artwork.

## Optional

- [MIT License](${site.repositoryUrl}/blob/main/LICENSE): License for Quizmon's source code.
`;

export const structuredData = JSON.stringify({
  '@context': 'https://schema.org',
  '@type': ['VideoGame', 'WebApplication'],
  name: site.name,
  description: site.description,
  url: site.url,
  image: absoluteUrl(site.socialImage.path),
  inLanguage: site.language,
  applicationCategory: 'GameApplication',
  operatingSystem: 'Any',
  playMode: 'SinglePlayer',
  isAccessibleForFree: true,
  offers: {
    '@type': 'Offer',
    price: 0,
    priceCurrency: 'USD',
  },
});

export const generatedAssets = [
  {
    fileName: 'site.webmanifest',
    contentType: 'application/manifest+json',
    source: manifest,
  },
  {
    fileName: 'robots.txt',
    contentType: 'text/plain; charset=utf-8',
    source: robots,
  },
  {
    fileName: 'sitemap.xml',
    contentType: 'application/xml; charset=utf-8',
    source: sitemap,
  },
  {
    fileName: 'llms.txt',
    contentType: 'text/plain; charset=utf-8',
    source: llms,
  },
  {
    fileName: 'index.md',
    contentType: 'text/markdown; charset=utf-8',
    source: pageMarkdown,
  },
] as const;
