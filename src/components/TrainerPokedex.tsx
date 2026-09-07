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
  const [registered] = useState(() => new Set(readPlayerData().pokedex));
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(0);
  const entries = useMemo(
    () => Object.entries(catalog.pokemon).sort(([, a], [, b]) => a.id - b.id),
    [catalog],
  );
  const count = entries.filter(([name]) => registered.has(name)).length;
  const query = search.trim().toLowerCase().replace(/^#/, '');
  const matches = entries.filter(([name, pokemon]) => {
    const found = registered.has(name);
    return (
      (filter === 'all' || (filter === 'registered' ? found : !found)) &&
      (!query ||
        String(pokemon.id).padStart(4, '0').includes(query) ||
        (found && formatPokemonName(name).toLowerCase().includes(query)))
    );
  });
  const pages = Math.max(1, Math.ceil(matches.length / pageSize));
  const currentPage = Math.min(page, pages - 1);
  const visible = matches.slice(
    currentPage * pageSize,
    (currentPage + 1) * pageSize,
  );

  return (
    <section className="trainer-pokedex" aria-label="Pokédex collection">
      <div className="trainer-pokedex__summary">
        <strong>
          {count} / {entries.length} registered
        </strong>
        <p>
          Correct answers register the Pokémon in the question and its correct
          choices.
        </p>
      </div>
      <div className="trainer-pokedex__filters">
        <label>
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
        <label>
          Entries
          <select
            value={filter}
            onChange={(event) => {
              setFilter(event.target.value);
              setPage(0);
            }}
          >
            <option value="all">All</option>
            <option value="registered">Registered</option>
            <option value="missing">Missing</option>
          </select>
        </label>
      </div>
      <p className="trainer-pokedex__count" role="status">
        {matches.length === 0
          ? search
            ? 'No matching entries. Try a registered name or a Pokédex number.'
            : filter === 'missing'
              ? 'Every Pokémon is registered.'
              : 'No entries yet. Answer a question correctly to start your Pokédex.'
          : `${currentPage * pageSize + 1}–${Math.min((currentPage + 1) * pageSize, matches.length)} of ${matches.length} entries`}
      </p>
      {visible.length > 0 && (
        <ul className="trainer-pokedex__entries">
          {visible.map(([name, pokemon]) => {
            const found = registered.has(name);
            return (
              <li
                className={`trainer-pokedex__entry${found ? ' is-registered' : ''}`}
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
                    <PokemonIdentity dexNumber={pokemon.id} name={name} />
                    <TypeBadges
                      types={pokemon.types}
                      label={pokemon.types.join(' / ')}
                    />
                  </>
                ) : (
                  <span className="trainer-pokedex__missing">
                    <small>{formatPokedexNumber(pokemon.id)}</small>
                    <span>Not registered</span>
                  </span>
                )}
              </li>
            );
          })}
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
