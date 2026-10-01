import * as styles from './styles/classes.css.ts';
import { GameButton } from '@/components/GameButton';
import { QuestionIcon } from '@/components/icons';
import { PokemonIdentity } from '@/components/PokemonIdentity';
import { TypeBadges } from '@/components/TypeBadge';
import { formatPokedexNumber } from '@/domain/pokemon/format';
import {
  createPokemonSearchEntry,
  createSearch,
  normalizeSearch,
} from '@/domain/pokemon/search';
import type { PokemonCatalog } from '@/domain/pokemon/types';
import { useMemo, useState } from 'react';

const pageSize = 12;

export const TrainerPokedex = ({
  catalog,
  foundPokemon,
}: {
  catalog: PokemonCatalog;
  foundPokemon: string[];
}) => {
  const found = useMemo(() => new Set(foundPokemon), [foundPokemon]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const { entries, count } = useMemo(() => {
    const entries = Object.entries(catalog.pokemon)
      .sort(([, a], [, b]) => a.speciesId - b.speciesId)
      .map(([name, pokemon]) => {
        const isFound = found.has(name);
        return {
          found: isFound,
          pokemon,
          ...createPokemonSearchEntry({ name: isFound ? name : '' }),
          name,
          searchNumber: String(pokemon.speciesId).padStart(4, '0'),
        };
      });
    return { entries, count: entries.filter(({ found }) => found).length };
  }, [catalog, found]);
  const find = useMemo(
    () => createSearch(entries.filter(({ found }) => found)),
    [entries],
  );
  const query = normalizeSearch(search);
  const matches = !query
    ? entries
    : /^\d+$/.test(query)
      ? entries.filter(({ searchNumber }) => searchNumber.includes(query))
      : find(query);
  const pages = Math.max(1, Math.ceil(matches.length / pageSize));
  const currentPage = Math.min(page, pages - 1);
  const pageStart = currentPage * pageSize;
  const pageEnd = Math.min(pageStart + pageSize, matches.length);
  const visible = matches.slice(pageStart, pageEnd);

  return (
    <section className={styles.trainerPokedex} aria-label="Pokédex collection">
      <div className={styles.trainerPokedexSummary}>
        <strong>
          {count} / {entries.length} found
        </strong>
      </div>
      <label className={styles.trainerPokedexSearch}>
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
      <p className={styles.trainerPokedexCount} role="status">
        {matches.length === 0
          ? search
            ? 'No matching entries. Try another name or Pokédex number.'
            : 'No entries yet. Answer a question correctly to start your Pokédex.'
          : `${pageStart + 1}–${pageEnd} of ${matches.length} entries`}
      </p>
      {visible.length > 0 && (
        <ul className={styles.trainerPokedexEntries}>
          {visible.map(({ found, name, pokemon }) => (
            <li
              className={`${styles.trainerPokedexEntry}${found ? ` ${styles.isFound}` : ''}`}
              key={name}
            >
              <div className={styles.trainerPokedexPortrait} aria-hidden="true">
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
                <span className={styles.trainerPokedexMissing}>
                  <small>{formatPokedexNumber(pokemon.speciesId)}</small>
                  <span>Not found</span>
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
      {pages > 1 && (
        <nav className={styles.trainerPokedexPages} aria-label="Pokédex pages">
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
