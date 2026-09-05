const name = 'Quizmon';
const tagline = 'The Ultimate Pokémon Knowledge Test';
const title = `${name}: ${tagline}`;
const repositoryUrl = 'https://github.com/itay-raveh/quizmon';

export const site = {
  name,
  tagline,
  title,
  authorName: 'Itay Raveh',
  contactEmail: 'quizmon@raveh.dev',
  description:
    'Take the five-question Pokémon Daily Challenge each day, then practice types, moves, evolutions, stats, and more.',
  url: 'https://quizmon.raveh.dev/',
  repositoryUrl,
  pokemonLegalUrl: 'https://www.pokemon.com/us/legal/information',
  language: 'en',
  locale: 'en_US',
  themeColor: '#72c3ee',
  socialImage: {
    path: '/assets/images/social-card.png',
    type: 'image/png',
    width: 1200,
    height: 630,
    alt: `${title}. Play now.`,
  },
} as const;

export const absoluteSiteUrl = (path: string) => new URL(path, site.url).href;
export const siteHostname = new URL(site.url).hostname;
