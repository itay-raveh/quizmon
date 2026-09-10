import { useMemo, useState } from 'react';
import { formatPokedexNumber, formatPokemonName } from '@/game/format';
import { readPlayerData } from '@/game/player-storage';
import type { PokemonCatalog } from '@/game/types';
import { GameButton } from './GameButton';
import { QuestionIcon } from './icons';
import { PokemonIdentity } from './PokemonIdentity';
import { TypeBadges } from './TypeBadge';

const pageSize = 12;

export const TrainerPokedex = ({ catalog }: { catalog: PokemonCatalog }) => {
  const [foundPokemon] = useState(() => new Set(readPlayerData().pokedex));
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const { entries, count } = useMemo(() => {
    const entries = Object.entries(catalog.pokemon)
      .sort(([, a], [, b]) => a.speciesId - b.speciesId)
      .map(([name, pokemon]) => {
        const found = foundPokemon.has(name);
        return {
          found,
          name,
          pokemon,
          searchName: found ? formatPokemonName(name).toLowerCase() : '',
          searchNumber: String(pokemon.speciesId).padStart(4, '0'),
        };
      });
    return { entries, count: entries.filter(({ found }) => found).length };
  }, [catalog, foundPokemon]);
  const query = search.trim().toLowerCase().replace(/^#/, '');
  const matches = entries.filter(
    ({ searchName, searchNumber }) =>
      !query || searchNumber.includes(query) || searchName.includes(query),
  );
  const pages = Math.max(1, Math.ceil(matches.length / pageSize));
  const currentPage = Math.min(page, pages - 1);
  const pageStart = currentPage * pageSize;
  const pageEnd = Math.min(pageStart + pageSize, matches.length);
  const visible = matches.slice(pageStart, pageEnd);

  return (
    <section className="trainer-pokedex" aria-label="Pokédex collection">
      <div className="trainer-pokedex__summary">
        <strong>
          {count} / {entries.length} found
        </strong>
      </div>
      <label className="trainer-pokedex__search">
        Search Pokédex
        <input
          type="search"
          placeholder="Name or Pokédex number"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(0);
          }}
        />
      </label>
      <p className="trainer-pokedex__count" role="status">
        {matches.length === 0
          ? search
            ? 'No matching entries. Try another name or Pokédex number.'
            : 'No entries yet. Answer a question correctly to start your Pokédex.'
          : `${pageStart + 1}–${pageEnd} of ${matches.length} entries`}
      </p>
      {visible.length > 0 && (
        <ul className="trainer-pokedex__entries">
          {visible.map(({ found, name, pokemon }) => (
            <li
              className={`trainer-pokedex__entry${found ? ' is-found' : ''}`}
              key={name}
            >
              <div className="trainer-pokedex__portrait" aria-hidden="true">
                {found && pokemon.sprite ? (
                  <img
                    src={pokemon.sprite}
                    alt=""
                    width="96"
                    height="96"
                    loading="lazy"
                    decoding="async"
                  />
                ) : (
                  <QuestionIcon weight="bold" />
                )}
              </div>
              {found ? (
                <>
                  <PokemonIdentity dexNumber={pokemon.speciesId} name={name} />
                  <TypeBadges
                    types={pokemon.types}
                    label={pokemon.types.join(' / ')}
                  />
                </>
              ) : (
                <span className="trainer-pokedex__missing">
                  <small>{formatPokedexNumber(pokemon.speciesId)}</small>
                  <span>Not found</span>
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
      {pages > 1 && (
        <nav className="trainer-pokedex__pages" aria-label="Pokédex pages">
          <GameButton
            tone="quiet"
            disabled={currentPage === 0}
            onClick={() => setPage(currentPage - 1)}
          >
            Previous
          </GameButton>
          <span>
            {currentPage + 1} / {pages}
          </span>
          <GameButton
            tone="quiet"
            disabled={currentPage === pages - 1}
            onClick={() => setPage(currentPage + 1)}
          >
            Next
          </GameButton>
        </nav>
      )}
    </section>
  );
};
