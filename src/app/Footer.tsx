import { CoffeeIcon } from '@phosphor-icons/react/ssr';
import {
  footerCredits,
  footerDisclaimer,
  footerLinks,
} from './content-pages.ts';
import { site } from './site.ts';

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
