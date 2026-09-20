import { site } from './site.ts';

export const contentPages = [
  {
    path: '/about',
    label: 'How to play',
    title: 'How to play',
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

export const footerLinks = [
  { href: site.repositoryUrl, label: 'GitHub', external: true },
  ...contentPages.map(({ path, label }) => ({ href: path, label })),
];

export const footerDisclaimer =
  'Quizmon is unofficial and not affiliated with Nintendo. Pokémon and related names, characters, images, and trademarks belong to their respective owners.';

export const footerCredits = [
  {
    label: 'badges by',
    name: '@beresteyskaya',
    href: 'https://www.fiverr.com/beresteyskaya',
  },
  {
    label: 'Wordmark made with',
    name: 'TextStudio',
    href: 'https://www.textstudio.com',
  },
];
