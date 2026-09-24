import { absoluteSiteUrl, site } from '../src/app/site.ts';
import { contentPages } from '../src/app/content-pages.ts';

const sitemapUrl = absoluteSiteUrl('/sitemap.xml');

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
${[site.url, ...contentPages.map(({ path }) => absoluteSiteUrl(path))]
  .map(
    (url) => `  <url>
    <loc>${url}</loc>
  </url>`,
  )
  .join('\n')}
</urlset>
`;

export const structuredData = JSON.stringify({
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebSite',
      '@id': absoluteSiteUrl('/#website'),
      name: site.name,
      url: site.url,
      inLanguage: site.language,
      about: { '@id': absoluteSiteUrl('/#game') },
    },
    {
      '@type': ['VideoGame', 'WebApplication'],
      '@id': absoluteSiteUrl('/#game'),
      name: site.name,
      description: site.description,
      url: site.url,
      image: absoluteSiteUrl(site.socialImage.path),
      inLanguage: site.language,
      applicationCategory: 'GameApplication',
      operatingSystem: 'Any',
      playMode: 'https://schema.org/SinglePlayer',
      isAccessibleForFree: true,
      offers: {
        '@type': 'Offer',
        price: 0,
        priceCurrency: 'USD',
      },
    },
  ],
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
] as const;
