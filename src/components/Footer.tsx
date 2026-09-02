import { site } from '@/app/site';

export const Footer = () => (
  <footer className="site-footer">
    <span>
      Wordmark made with{' '}
      <a href="https://www.textstudio.co" rel="noreferrer" target="_blank">
        TextStudio
      </a>
    </span>
    <span aria-hidden="true">·</span>
    <span>
      Data from{' '}
      <a href="https://pokeapi.co" rel="noreferrer" target="_blank">
        PokéAPI
      </a>
    </span>
    <span aria-hidden="true">·</span>
    <a href={site.repositoryUrl} rel="noreferrer" target="_blank">
      Open source on GitHub
    </a>
    <span className="visually-hidden">Pokémon is a trademark of Nintendo.</span>
  </footer>
);
