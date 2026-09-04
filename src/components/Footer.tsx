import { site } from '@/app/site';

export const Footer = () => (
  <footer className="site-footer">
    <ul className="site-footer__groups" role="list">
      <li className="site-footer__group">
        <span className="site-footer__credit">
          <span className="site-footer__label site-footer__label--full">
            Wordmark made with{' '}
          </span>
          <span className="site-footer__label site-footer__label--compact">
            Logo:{' '}
          </span>
          <a href="https://www.textstudio.co" rel="noreferrer" target="_blank">
            TextStudio
          </a>
        </span>
        <span aria-hidden="true">·</span>
        <span className="site-footer__credit">
          <span className="site-footer__label site-footer__label--full">
            Custom art:{' '}
          </span>
          <span className="site-footer__label site-footer__label--compact">
            Custom art:{' '}
          </span>
          <a
            href="https://www.fiverr.com/beresteyskaya"
            rel="noreferrer"
            target="_blank"
          >
            @beresteyskaya
          </a>
        </span>
      </li>
      <li className="site-footer__group">
        <span className="site-footer__credit">
          <span className="site-footer__label site-footer__label--full">
            Data from{' '}
          </span>
          <span className="site-footer__label site-footer__label--compact">
            Data:{' '}
          </span>
          <a href="https://pokeapi.co" rel="noreferrer" target="_blank">
            PokéAPI
          </a>
        </span>
        <span aria-hidden="true">·</span>
        <span className="site-footer__credit">
          <span className="site-footer__label site-footer__label--full">
            Open source on{' '}
          </span>
          <span className="site-footer__label site-footer__label--compact">
            Code:{' '}
          </span>
          <a href={site.repositoryUrl} rel="noreferrer" target="_blank">
            GitHub
          </a>
        </span>
      </li>
    </ul>
    <span className="visually-hidden">Pokémon is a trademark of Nintendo.</span>
  </footer>
);
