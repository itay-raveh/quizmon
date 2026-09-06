const name = 'Quizmon';
const tagline = 'The Ultimate Pokémon Knowledge Test';
const title = `${name}: Pokémon Quiz & Daily Challenge`;
const repositoryUrl = 'https://github.com/itay-raveh/quizmon';

export const site = {
  name,
  tagline,
  title,
  authorName: 'Itay Raveh',
  contactEmail: 'quizmon@raveh.dev',
  description:
    'Play a free Pokémon quiz with a five-question Daily Challenge and unlimited Training. Test types, evolutions, moves, and more. No account needed.',
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
    alt: `${name}: ${tagline}. Play now.`,
  },
} as const;

export const absoluteSiteUrl = (path: string) => new URL(path, site.url).href;
