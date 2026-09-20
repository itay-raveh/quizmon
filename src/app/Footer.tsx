import { footerCredits, footerLinks } from '@/app/content-pages';
import { site } from '@/app/site';
import { CoffeeIcon } from '@/components/icons';
import './footer.css';

export const Footer = () => (
  <footer className="site-footer">
    <div className="site-footer__support-row">
      <a
        className="site-footer__support"
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
      <a href={`mailto:${site.contactEmail}`}>Contact me</a>
    </div>
    <nav className="site-footer__links" aria-label="Help and information">
      {footerLinks.map(({ href, label, ...link }) => (
        <a
          key={href}
          href={href}
          {...('external' in link && link.external
            ? { target: '_blank', rel: 'noreferrer' }
            : {})}
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
  </footer>
);
