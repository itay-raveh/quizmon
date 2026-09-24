import { CoffeeIcon } from '@phosphor-icons/react/ssr';
import { contentPages } from './content-pages.ts';
import { site } from './site.ts';

const footerLinks = contentPages.map(({ path, label }) => ({
  href: path,
  label,
}));

const footerDisclaimer =
  'Quizmon is unofficial and not affiliated with Nintendo. Pokémon and related names, characters, images, and trademarks belong to their respective owners.';

const footerCredits = [
  {
    label: 'Badges:',
    name: '@beresteyskaya',
    href: 'https://www.fiverr.com/beresteyskaya',
  },
  {
    label: 'Logo made with',
    name: 'TextStudio',
    href: 'https://www.textstudio.com',
  },
  {
    label: 'Data:',
    name: 'PokéAPI',
    href: 'https://pokeapi.co/',
  },
  {
    label: 'Sprites & text:',
    name: 'Pokémon Showdown',
    href: 'https://pokemonshowdown.com/',
  },
];

export const Footer = ({ currentPath }: { currentPath?: string }) => {
  return (
    <footer className="site-footer">
      <div className="site-footer__support-row">
        <a
          className="game-button game-button--quiet site-footer__support"
          href={site.supportUrl}
          target="_blank"
          rel="noopener"
          referrerPolicy="origin"
        >
          <CoffeeIcon size={22} weight="bold" aria-hidden="true" />
          Buy me a coffee
        </a>
      </div>
      <div className="site-footer__people">
        <span>
          © {new Date().getFullYear()}{' '}
          <a href={site.authorUrl} rel="noreferrer" target="_blank">
            {site.authorName}
          </a>
        </span>
        <a href={site.repositoryUrl} rel="noreferrer" target="_blank">
          GitHub
        </a>
        <a href={`mailto:${site.contactEmail}`}>Contact</a>
      </div>
      <div className="site-footer__more">
        <nav className="site-footer__links" aria-label="Help and information">
          {footerLinks.map(({ href, label }) => (
            <a
              key={href}
              href={href}
              aria-current={href === currentPath ? 'page' : undefined}
            >
              {label}
            </a>
          ))}
        </nav>
        <div className="site-footer__credits">
          {footerCredits.map(({ label, name, href }) => (
            <span key={href}>
              {label}{' '}
              <a href={href} rel="noreferrer" target="_blank">
                {name}
              </a>
            </span>
          ))}
        </div>
        <p className="site-footer__disclaimer">{footerDisclaimer}</p>
      </div>
    </footer>
  );
};
