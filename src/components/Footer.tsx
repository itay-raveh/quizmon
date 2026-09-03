import { site } from '@/app/site';

export const Footer = () => (
  <footer className="site-footer">
    <span>
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
    <span>
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
    <a href={site.repositoryUrl} rel="noreferrer" target="_blank">
      <span className="site-footer__label site-footer__label--full">
        Open source on{' '}
      </span>
      GitHub
    </a>
    <span className="visually-hidden">Pokémon is a trademark of Nintendo.</span>
  </footer>
);
