import { site } from '@/app/site';

export const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <ul className="site-footer__groups" role="list">
        <li className="site-footer__group site-footer__group--primary">
          <span className="site-footer__credit">
            © {currentYear} {site.authorName}
          </span>
          <span className="site-footer__credit">
            <a
              aria-label={`Email Quizmon at ${site.contactEmail}`}
              href={`mailto:${site.contactEmail}`}
            >
              {site.contactEmail}
            </a>
          </span>
          <span className="site-footer__credit">
            <a
              aria-label="Quizmon source code and issue tracker on GitHub"
              href={site.repositoryUrl}
              rel="noreferrer"
              target="_blank"
            >
              GitHub
            </a>
          </span>
        </li>
        <li className="site-footer__group site-footer__group--credits">
          <span className="site-footer__credit">
            Logo:{' '}
            <a
              href="https://www.textstudio.co"
              rel="noreferrer"
              target="_blank"
            >
              TextStudio
            </a>
          </span>
          <span className="site-footer__credit">
            Data:{' '}
            <a href="https://pokeapi.co" rel="noreferrer" target="_blank">
              PokéAPI
            </a>
          </span>
          <span className="site-footer__credit">
            Art:{' '}
            <a
              href="https://www.fiverr.com/beresteyskaya"
              rel="noreferrer"
              target="_blank"
            >
              @beresteyskaya
            </a>
          </span>
        </li>
        <li className="site-footer__group site-footer__group--legal">
          <span>Pokémon © </span>
          <a href={site.pokemonLegalUrl} rel="noreferrer" target="_blank">
            Nintendo / The Pokémon Company
          </a>
        </li>
      </ul>
    </footer>
  );
};
