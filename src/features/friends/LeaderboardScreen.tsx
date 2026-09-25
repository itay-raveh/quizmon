import { useEffect, useState, useSyncExternalStore } from 'react';
import { GameButton } from '../../components/GameButton';
import { EyeIcon, LockSimpleIcon } from '../../components/icons';
import { isDailyDate } from '../../lib/validation';
import { getUtcDate } from '../../domain/quiz/daily';
import { currentDailyTrack } from '../../domain/quiz/daily-track';
import { getDailyPuzzleId } from '../../domain/quiz/puzzle-id';
import type { PokemonCatalog } from '../../domain/pokemon/types';
import { readDailyResult } from '../../lib/storage/results-storage';
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
import { SocialSections } from './SocialSections';
import './friends.css';

const standingsCache = new Map<string, Leaderboard>();

function StandingsSkeleton() {
  return (
    <div
      className="leaderboard-loading"
      role="status"
      aria-label="Loading standings"
    >
      <p className="visually-hidden">Loading standings</p>
      <table className="leaderboard-table" aria-hidden="true">
        <thead>
          <tr>
            <th>Rank</th>
            <th>Trainer</th>
            <th>Score / time</th>
          </tr>
        </thead>
        <tbody>
          {[0, 1, 2].map((row) => (
            <tr key={row}>
              <td>
                <span className="social-skeleton" />
              </td>
              <th>
                <span className="social-skeleton" />
              </th>
              <td>
                <span className="social-skeleton" />
                <span className="social-skeleton" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Standings({
  owner,
  catalog,
  mode,
  date,
  scope,
  onViewPlayer,
}: {
  owner: string;
  catalog?: PokemonCatalog;
  mode: LeaderboardMode;
  date: string;
  scope: LeaderboardScope;
  onViewPlayer: (id: string) => void;
}) {
  const dailyDate = mode === 'daily' ? date : '';
  const dailyCatalog = mode === 'daily' ? catalog : undefined;
  const cacheKey = `${owner}:${mode}:${dailyDate}:${scope}`;
  const [data, setData] = useState<Leaderboard | undefined>(() =>
    standingsCache.get(`${cacheKey}:`),
  );
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(!data);
  const [request, setRequest] = useState({
    after: null as string | null,
    revision: 0,
  });
  useEffect(() => {
    const key = `${cacheKey}:${request.after ?? ''}`;
    const controller = new AbortController();
    const read = async () => {
      if (mode === 'daily') {
        let savedId: string | undefined;
        try {
          savedId = readDailyResult(dailyDate, currentDailyTrack)?.puzzleId;
        } catch {
          // The leaderboard can load before the local save opens.
        }
        if (!savedId && !dailyCatalog)
          throw new Error('Daily catalog is unavailable.');
        return readDailyLeaderboard(
          owner,
          dailyDate,
          scope,
          savedId ?? (await getDailyPuzzleId(dailyCatalog!, dailyDate)),
          request.after,
          controller.signal,
        );
      }
      return readTrainingLeaderboard(
        owner,
        scope,
        request.after,
        controller.signal,
      );
    };
    void read()
      .then((next) => {
        if (!controller.signal.aborted) {
          standingsCache.delete(key);
          standingsCache.set(key, next);
          if (standingsCache.size > 24)
            standingsCache.delete(standingsCache.keys().next().value!);
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
  }, [owner, dailyCatalog, mode, dailyDate, scope, request, cacheKey]);
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === 'visible' && navigator.onLine)
        setRequest((current) => ({
          ...current,
          revision: current.revision + 1,
        }));
    };
    const timer = window.setInterval(refresh, 60_000);
    document.addEventListener('visibilitychange', refresh);
    window.addEventListener('online', refresh);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', refresh);
      window.removeEventListener('online', refresh);
    };
  }, []);
  const load = (after: string | null) => {
    const cached = standingsCache.get(`${cacheKey}:${after ?? ''}`);
    setData(cached);
    setBusy(!cached);
    setError('');
    setRequest((current) => ({ after, revision: current.revision + 1 }));
  };
  return (
    <section
      className="leaderboard-standings"
      aria-label={`${scope === 'global' ? 'Global' : 'Friends'} ${mode === 'daily' ? 'Daily' : 'Training'} standings`}
      aria-busy={busy}
    >
      {busy && !data && <StandingsSkeleton />}
      {error && (
        <p role="alert" className="settings-error">
          {error}
          {data ? ' Showing the last loaded standings.' : ''}
        </p>
      )}
      {error && !data && !busy && (
        <GameButton tone="quiet" onClick={() => load(null)}>
          Retry
        </GameButton>
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
                      <span className="leaderboard-player">
                        <span>
                          {row.player.name}
                          {row.player.id === owner ? ' (you)' : ''}
                        </span>
                        {row.player.id !== owner && (
                          <GameButton
                            aria-label={`View ${row.player.name}'s profile`}
                            className="friends-icon-button"
                            onClick={() => onViewPlayer(row.player.id)}
                            title={`View ${row.player.name}'s profile`}
                            tone="quiet"
                          >
                            <EyeIcon aria-hidden="true" weight="regular" />
                          </GameButton>
                        )}
                      </span>
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
          {(request.after || data.nextCursor) && (
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
          )}
        </>
      )}
    </section>
  );
}

export function LeaderboardScreen({
  catalog,
  onAccount,
  onViewPlayer,
  initialDate,
  initialScope = 'global',
  initialMode = 'daily',
  onSelectionChange,
}: {
  catalog?: PokemonCatalog;
  onAccount: () => void;
  onViewPlayer: (id: string) => void;
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
    <section
      className="game-panel social-screen"
      aria-labelledby="social-title"
    >
      <header className="game-panel__header">
        <h1 className="game-panel__title" id="social-title">
          Social
        </h1>
      </header>
      <SocialSections active="rankings" />
      <div className="friends-panel">
        {account.owner && !account.mergeRequired ? (
          <>
            <div
              className="leaderboard-modes"
              role="group"
              aria-label="Game mode"
            >
              <button
                type="button"
                aria-pressed={mode === 'daily'}
                onClick={() => chooseMode('daily')}
              >
                Daily
              </button>
              <button
                type="button"
                aria-pressed={mode === 'training'}
                onClick={() => chooseMode('training')}
              >
                Training
              </button>
            </div>
            <div className="leaderboard-controls">
              <div className="leaderboard-filter">
                <span>Players</span>
                <div
                  className="leaderboard-scopes"
                  role="group"
                  aria-label="Leaderboard players"
                >
                  <button
                    type="button"
                    aria-pressed={scope === 'global'}
                    onClick={() => chooseScope('global')}
                  >
                    Global
                  </button>
                  <button
                    type="button"
                    aria-pressed={scope === 'friends'}
                    onClick={() => chooseScope('friends')}
                  >
                    Friends
                  </button>
                </div>
              </div>
              {mode === 'daily' && (
                <label className="leaderboard-filter leaderboard-date">
                  Date
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
              key={`${account.owner}:${mode}:${mode === 'daily' ? date : ''}:${scope}`}
              owner={account.owner}
              catalog={catalog}
              mode={mode}
              date={date}
              scope={scope}
              onViewPlayer={onViewPlayer}
            />
          </>
        ) : (
          <div className="leaderboard-locked">
            <LockSimpleIcon aria-hidden="true" weight="duotone" />
            <p>
              {account.mergeRequired
                ? 'Choose your progress to view rankings.'
                : 'Sign in to view rankings.'}
            </p>
            {account.mergeRequired && (
              <GameButton onClick={onAccount}>Choose progress</GameButton>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
