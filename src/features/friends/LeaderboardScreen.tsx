import { useEffect, useState, useSyncExternalStore } from 'react';
import { GameButton } from '../../components/GameButton';
import { LockSimpleIcon } from '../../components/icons';
import { formatPokemonName } from '../../domain/pokemon/format';
import { isDailyDate } from '../../lib/validation';
import { getUtcDate } from '../../domain/quiz/daily';
import type {
  Leaderboard,
  LeaderboardMode,
  LeaderboardScope,
} from '../../domain/social/leaderboards';
import { accountSnapshot, subscribeAccount } from '../account/account';
import {
  readDailyLeaderboard,
  readTrainingLeaderboard,
} from './leaderboards-client';
import './friends.css';

function Standings({
  owner,
  mode,
  date,
  scope,
  onManageFriends,
}: {
  owner: string;
  mode: LeaderboardMode;
  date: string;
  scope: LeaderboardScope;
  onManageFriends: () => void;
}) {
  const [data, setData] = useState<Leaderboard>();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(true);
  const [request, setRequest] = useState({
    after: null as string | null,
    revision: 0,
  });
  useEffect(() => {
    const controller = new AbortController();
    void (
      mode === 'daily'
        ? readDailyLeaderboard(
            owner,
            date,
            scope,
            request.after,
            controller.signal,
          )
        : readTrainingLeaderboard(
            owner,
            scope,
            request.after,
            controller.signal,
          )
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
  }, [owner, mode, date, scope, request]);
  const load = (after: string | null) => {
    setBusy(true);
    setRequest((current) => ({ after, revision: current.revision + 1 }));
  };
  return (
    <section
      className="leaderboard-standings"
      aria-label={`${scope === 'global' ? 'Global' : 'Friends'} ${mode === 'daily' ? 'Daily' : 'Training'} standings`}
      aria-busy={busy}
    >
      {busy && !data && (
        <div
          className="leaderboard-loading"
          role="status"
          aria-label="Loading standings"
        >
          <p className="visually-hidden">Loading standings</p>
          <span />
          <span />
          <span />
        </div>
      )}
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
              <span>
                Your place <strong>#{data.viewer.rank}</strong>
              </span>
              <span>
                <strong>{data.viewer.score.toLocaleString()}</strong> points
              </span>
            </div>
          ) : null}
          {data.items.length ? (
            <table className="leaderboard-table">
              <caption className="visually-hidden">
                {mode === 'daily'
                  ? `Daily standings for ${date}`
                  : 'Training standings'}
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
            <div className="leaderboard-empty">
              <strong>No scores yet</strong>
              <p>
                {mode === 'daily'
                  ? 'Completed Daily rounds appear here after syncing.'
                  : 'Finish a Training round to join the standings.'}
              </p>
            </div>
          )}
          {data.items.length > 0 && (
            <p className="social-screen__note">
              {data.total} {data.total === 1 ? 'trainer' : 'trainers'}
            </p>
          )}
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
          Refresh
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
  initialMode = 'daily',
  onSelectionChange,
}: {
  onManageFriends: () => void;
  initialDate?: string;
  initialScope?: LeaderboardScope;
  initialMode?: LeaderboardMode;
  onSelectionChange?: (
    date: string,
    scope: LeaderboardScope,
    mode: LeaderboardMode,
  ) => void;
}) {
  const account = useSyncExternalStore(subscribeAccount, accountSnapshot);
  const [scope, setScope] = useState<LeaderboardScope>(initialScope);
  const [mode, setMode] = useState<LeaderboardMode>(initialMode);
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
          onSelectionChange?.(next, scope, mode);
        }
      }
    }, 30_000);
    return () => window.clearInterval(timer);
  }, [today, date, scope, mode, onSelectionChange]);
  const chooseScope = (next: LeaderboardScope) => {
    setScope(next);
    onSelectionChange?.(date, next, mode);
  };
  const chooseMode = (next: LeaderboardMode) => {
    setMode(next);
    onSelectionChange?.(date, scope, next);
  };
  const chooseDate = (next: string) => {
    if (isDailyDate(next) && next <= today) {
      setDate(next);
      onSelectionChange?.(next, scope, mode);
    }
  };
  return (
    <section className="social-screen" aria-labelledby="leaderboard-title">
      <header className="social-screen__header">
        <h1 id="leaderboard-title">Leaderboards</h1>
      </header>
      <div className="friends-panel">
        {account.owner && !account.mergeRequired ? (
          <>
            <div
              className="leaderboard-modes"
              role="group"
              aria-label="Leaderboard mode"
            >
              <GameButton
                tone={mode === 'daily' ? 'primary' : 'quiet'}
                aria-pressed={mode === 'daily'}
                onClick={() => chooseMode('daily')}
              >
                Daily
              </GameButton>
              <GameButton
                tone={mode === 'training' ? 'primary' : 'quiet'}
                aria-pressed={mode === 'training'}
                onClick={() => chooseMode('training')}
              >
                Training
              </GameButton>
            </div>
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
              {mode === 'daily' && (
                <label>
                  Daily date (UTC)
                  <input
                    type="date"
                    value={date}
                    max={today}
                    onChange={(event) => chooseDate(event.target.value)}
                  />
                </label>
              )}
            </div>
            <Standings
              key={`${account.owner}:${mode}:${date}:${scope}`}
              owner={account.owner}
              mode={mode}
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
                {mode === 'daily'
                  ? 'Daily rounds qualify on their assigned UTC date.'
                  : 'Your best Training score in the current scoring version counts.'}
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
