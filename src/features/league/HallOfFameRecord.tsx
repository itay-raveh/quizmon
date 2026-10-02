import { PokemonIdentity } from '@/components/PokemonIdentity';
import { PlayerName } from '@/components/PlayerName';
import type { LeagueVictoryRecord } from '@/domain/player/hall-of-fame';
import { formatPokemonName } from '@/domain/pokemon/format';
import { formatScore } from '@/domain/quiz/format';
import type { PokemonCatalog } from '@/domain/pokemon/types';
import { LeagueTrophy } from '@/features/league/LeagueTrophy';
import {
  arrangeGroup,
  fallbackSpriteMeasurements,
  unpackSpriteMeasurements,
} from '@/features/trainer/hall-portrait';

export const HallOfFameRecord = ({
  catalog,
  record,
  number,
}: {
  catalog: PokemonCatalog;
  record: LeagueVictoryRecord;
  number: number;
}) => {
  const sizes = new Map(
    record.pokemon.map((name) => {
      const measurements = catalog.pokemon[name]?.spriteMeasurements;
      return [
        name,
        measurements
          ? unpackSpriteMeasurements(measurements)
          : fallbackSpriteMeasurements,
      ];
    }),
  );

  return (
    <article className="hall-record" aria-label={`Victory ${number}`}>
      <h1 tabIndex={-1}>Hall of Fame</h1>
      <div className="hall-record__portrait">
        <LeagueTrophy />
        <ul className="hall-record__group" aria-label="Challenge Pokémon">
          {arrangeGroup(record.pokemon, sizes).map(
            ({ name, left, top, width, layer, mirrored }) => (
              <li
                key={name}
                title={formatPokemonName(name)}
                style={{
                  left: `${left}%`,
                  top: `${top}%`,
                  width: `${width}%`,
                  zIndex: layer,
                }}
              >
                {catalog.pokemon[name]?.sprite ? (
                  <img
                    className={
                      mirrored ? 'hall-record__sprite--flipped' : undefined
                    }
                    src={catalog.pokemon[name].sprite}
                    alt=""
                    width="96"
                    height="96"
                    decoding="async"
                  />
                ) : (
                  <span className="hall-record__missing" aria-hidden="true">
                    ?
                  </span>
                )}
                <PokemonIdentity className="visually-hidden" name={name} />
              </li>
            ),
          )}
        </ul>
      </div>
      <div className="hall-record__honors">
        <h2>
          <PlayerName
            trainer={{ name: record.trainerName, leagueCompleted: true }}
            fallback="League Champion"
          />
        </h2>
        <p className="hall-record__score">
          <strong>{formatScore(record.result.score)}</strong> points
        </p>
      </div>
      <footer className="hall-record__signature">
        <span>Victory {String(number).padStart(3, '0')}</span>
        <time dateTime={record.completedAt}>
          {new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(
            new Date(record.completedAt),
          )}
        </time>
      </footer>
    </article>
  );
};
