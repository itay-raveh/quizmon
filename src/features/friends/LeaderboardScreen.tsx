import { useEffect, useState, useSyncExternalStore } from 'react';
import { GameButton } from '../../components/GameButton';
import { LockSimpleIcon } from '../../components/icons';
import { formatPokemonName } from '../../domain/pokemon/format';
import { isDailyDate } from '../../lib/validation';
import { getUtcDate } from '../../domain/quiz/daily';
import { formatFriendCode } from '../../domain/social/friends';
import type {
  DailyLeaderboard,
  LeaderboardScope,
} from '../../domain/social/leaderboards';
import { accountSnapshot, subscribeAccount } from '../account/account';
import { readDailyLeaderboard } from './leaderboards-client';
import './friends.css';

function Standings({
  owner,
  date,
  scope,
  onManageFriends,
}: {
  owner: string;
  date: string;
  scope: LeaderboardScope;
  onManageFriends: () => void;
}) {
  const [data, setData] = useState<DailyLeaderboard>();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(true);
  const [request, setRequest] = useState({
    after: null as string | null,
    revision: 0,
  });
  useEffect(() => {
    const controller = new AbortController();
    void readDailyLeaderboard(
      owner,
      date,
      scope,
      request.after,
      controller.signal,
    )
      .then((next) => {
        if (!controller.signal.aborted) {
          setData(next);
          setError('');
        }
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted)
          setError(
            cause instanceof TypeError
              ? 'Could not reach the leaderboard. Check your connection and try again.'
              : cause instanceof Error
                ? cause.message
                : 'Could not load the leaderboard.',
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setBusy(false);
      });
    return () => controller.abort();
  }, [owner, date, scope, request]);
  const load = (after: string | null) => {
    setBusy(true);
    setRequest((current) => ({ after, revision: current.revision + 1 }));
  };
  return (
    <section
      className="leaderboard-standings"
      aria-label={`${scope === 'global' ? 'Global' : 'Friends'} Daily standings`}
      aria-busy={busy}
    >
      {busy && <p role="status">Loading standings…</p>}
      {error && (
        <p role="alert" className="settings-error">
          {error}
          {data ? ' Showing the last loaded standings.' : ''}
        </p>
      )}
      {data && (
        <>
          {data.viewer ? (
            <div className="leaderboard-viewer">
              <p>
                Your rank <strong>{data.viewer.rank}</strong> of {data.total}
              </p>
              <p>
                {data.viewer.score.toLocaleString()} points ·{' '}
                {(data.viewer.elapsedMilliseconds / 1000).toFixed(3)}s
              </p>
            </div>
          ) : (
            <p>
              {date === getUtcDate()
                ? 'No ranked result yet. Eligible Daily results appear automatically after syncing.'
                : 'You have no ranked result for this date.'}
            </p>
          )}
          {data.items.length ? (
            <table className="leaderboard-table">
              <caption className="visually-hidden">
                Daily standings for {date}
              </caption>
              <thead>
                <tr>
                  <th scope="col">Rank</th>
                  <th scope="col">Trainer</th>
                  <th scope="col">Score / time</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((row) => (
                  <tr
                    key={row.player.id}
                    aria-current={row.player.id === owner ? 'true' : undefined}
                  >
                    <td>{row.rank}</td>
                    <th scope="row">
                      <span>
                        {row.player.name}
                        {row.player.id === owner ? ' (you)' : ''}
                      </span>
                      {row.player.partnerPokemon && (
                        <small>
                          {formatPokemonName(row.player.partnerPokemon)}
                        </small>
                      )}
                      {row.player.code && (
                        <small>{formatFriendCode(row.player.code)}</small>
                      )}
                    </th>
                    <td>
                      <strong>{row.score.toLocaleString()}</strong>
                      <small>
                        {(row.elapsedMilliseconds / 1000).toFixed(3)}s
                      </small>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p>
              {scope === 'friends'
                ? 'No scores from you or your friends for this Daily yet.'
                : 'No scores for this Daily yet.'}
            </p>
          )}
          <p className="social-screen__note">
            {data.total} {data.total === 1 ? 'player' : 'players'} · Updated{' '}
            {new Date(data.checkedAt).toLocaleTimeString()}
          </p>
          <div className="friends-actions">
            {request.after && (
              <GameButton
                tone="quiet"
                disabled={busy}
                onClick={() => load(null)}
              >
                First page
              </GameButton>
            )}
            {data.nextCursor && (
              <GameButton
                tone="quiet"
                disabled={busy}
                onClick={() => load(data.nextCursor)}
              >
                Next page
              </GameButton>
            )}
          </div>
        </>
      )}
      <div className="friends-actions">
        <GameButton tone="quiet" disabled={busy} onClick={() => load(null)}>
          Refresh leaderboard
        </GameButton>
        {scope === 'friends' && (
          <GameButton tone="quiet" onClick={onManageFriends}>
            Manage friends
          </GameButton>
        )}
      </div>
    </section>
  );
}

export function LeaderboardScreen({
  onManageFriends,
  initialDate,
  initialScope = 'global',
  onSelectionChange,
}: {
  onManageFriends: () => void;
  initialDate?: string;
  initialScope?: LeaderboardScope;
  onSelectionChange?: (date: string, scope: LeaderboardScope) => void;
}) {
  const account = useSyncExternalStore(subscribeAccount, accountSnapshot);
  const [scope, setScope] = useState<LeaderboardScope>(initialScope);
  const [date, setDate] = useState(() =>
    initialDate && isDailyDate(initialDate) && initialDate <= getUtcDate()
      ? initialDate
      : getUtcDate(),
  );
  const [today, setToday] = useState(getUtcDate);
  useEffect(() => {
    const timer = window.setInterval(() => {
      const next = getUtcDate();
      if (next !== today) {
        setToday(next);
        if (date === today) {
          setDate(next);
          onSelectionChange?.(next, scope);
        }
      }
    }, 30_000);
    return () => window.clearInterval(timer);
  }, [today, date, scope, onSelectionChange]);
  const chooseScope = (next: LeaderboardScope) => {
    setScope(next);
    onSelectionChange?.(date, next);
  };
  const chooseDate = (next: string) => {
    if (isDailyDate(next) && next <= today) {
      setDate(next);
      onSelectionChange?.(next, scope);
    }
  };
  return (
    <section className="social-screen" aria-labelledby="leaderboard-title">
      <header className="social-screen__header">
        <h1 id="leaderboard-title">Daily leaderboard</h1>
      </header>
      <div className="friends-panel">
        {account.owner && !account.mergeRequired ? (
          <>
            <div className="leaderboard-controls">
              <div
                className="friends-actions"
                role="group"
                aria-label="Leaderboard players"
              >
                <GameButton
                  tone={scope === 'global' ? 'primary' : 'quiet'}
                  aria-pressed={scope === 'global'}
                  onClick={() => chooseScope('global')}
                >
                  Global
                </GameButton>
                <GameButton
                  tone={scope === 'friends' ? 'primary' : 'quiet'}
                  aria-pressed={scope === 'friends'}
                  onClick={() => chooseScope('friends')}
                >
                  Friends
                </GameButton>
              </div>
              <label>
                Daily date (UTC)
                <input
                  type="date"
                  value={date}
                  max={today}
                  onChange={(event) => chooseDate(event.target.value)}
                />
              </label>
            </div>
            <Standings
              key={`${account.owner}:${date}:${scope}`}
              owner={account.owner}
              date={date}
              scope={scope}
              onManageFriends={onManageFriends}
            />
            <details className="leaderboard-rules">
              <summary>How ranking works</summary>
              <p>
                Highest score first; faster answer time breaks ties. Exact ties
                share rank. Offline results can arrive later, so standings can
                change.
              </p>
              <p>
                Daily results qualify when completed on their assigned UTC date.
                Eligible saved results join automatically when you sign in and
                sync.
              </p>
            </details>
          </>
        ) : (
          <div className="leaderboard-locked">
            <LockSimpleIcon aria-hidden="true" weight="duotone" />
            <p>Sign in to view leaderboards.</p>
          </div>
        )}
      </div>
    </section>
  );
}
