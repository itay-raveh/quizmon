import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Link } from 'react-router';
import { GameButton } from '../../components/GameButton';
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  EyeIcon,
  ShareNetworkIcon,
} from '../../components/icons';
import { isDailyDate } from '../../lib/validation';
import { useInteractionSound } from '../../lib/audio/sound-context';
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
import { friendPage, ownPlayer } from './friends-client';
import { canShareFriendLink, shareFriendLink } from './friend-sharing';
import './friends.css';

const standingsCache = new Map<string, Leaderboard>();

function InviteFriends({
  owner,
  onError,
  retry,
  failed,
  onShareFailure,
}: {
  owner: string;
  onError: (failed: boolean) => void;
  retry: number;
  failed: boolean;
  onShareFailure: (link: string) => void;
}) {
  const [code, setCode] = useState('');
  const [message, setMessage] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    void ownPlayer(owner, controller.signal)
      .then((player) => {
        if (!controller.signal.aborted) {
          setCode(player.code ?? '');
          onError(!player.code);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) onError(true);
      });
    return () => controller.abort();
  }, [owner, onError, retry]);
  const link = `${location.origin}/social/friends?code=${code}`;
  return (
    <div className="leaderboard-invite">
      <GameButton
        tone="quiet"
        disabled={!code}
        onClick={() => {
          setMessage('');
          onShareFailure('');
          void shareFriendLink(link)
            .then((result) =>
              setMessage(
                result === 'shared'
                  ? 'Friend link shared.'
                  : result === 'copied'
                    ? 'Friend link copied.'
                    : '',
              ),
            )
            .catch(() => {
              onShareFailure(link);
            });
        }}
      >
        <ShareNetworkIcon aria-hidden="true" />
        {!code
          ? failed
            ? 'Invite friends'
            : 'Loading invite link…'
          : canShareFriendLink()
            ? 'Invite friends'
            : 'Copy invite link'}
      </GameButton>
      {message && <p role="status">{message}</p>}
    </div>
  );
}

function shiftDailyDate(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return getUtcDate(value);
}

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
  onOpenPlay,
  onError,
}: {
  owner: string;
  catalog?: PokemonCatalog;
  mode: LeaderboardMode;
  date: string;
  scope: LeaderboardScope;
  onViewPlayer: (id: string) => void;
  onOpenPlay: () => void;
  onError: (message: string) => void;
}) {
  const playSound = useInteractionSound();
  const dailyDate = mode === 'daily' ? date : '';
  const dailyCatalog = mode === 'daily' ? catalog : undefined;
  const cacheKey = `${owner}:${mode}:${dailyDate}:${scope}`;
  const [data, setData] = useState<Leaderboard | undefined>(() =>
    standingsCache.get(`${cacheKey}:`),
  );
  const [hasFriends, setHasFriends] = useState<boolean | null>();
  const [busy, setBusy] = useState(!data);
  const [request, setRequest] = useState({
    after: null as string | null,
    revision: 0,
  });
  useEffect(() => {
    if (scope !== 'friends' || data?.items.length !== 0) return;
    const controller = new AbortController();
    void friendPage(owner, 'friends', undefined, controller.signal)
      .then((page) => {
        if (!controller.signal.aborted) setHasFriends(page.items.length > 0);
      })
      .catch(() => {
        if (!controller.signal.aborted) setHasFriends(null);
      });
    return () => controller.abort();
  }, [owner, scope, data]);
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
          onError('');
        }
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted)
          onError(
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
  }, [owner, dailyCatalog, mode, dailyDate, scope, request, cacheKey, onError]);
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
    onError('');
    setRequest((current) => ({ after, revision: current.revision + 1 }));
  };
  const noFriends =
    scope === 'friends' && data?.items.length === 0 && hasFriends === false;
  const checkingFriends =
    scope === 'friends' && data?.items.length === 0 && hasFriends === undefined;
  const pastDaily = mode === 'daily' && date < getUtcDate();
  return (
    <section
      className="leaderboard-standings"
      aria-label={`${scope === 'global' ? 'Global' : 'Friends'} ${mode === 'daily' ? 'Daily' : 'Training'} standings`}
      aria-busy={busy || checkingFriends}
    >
      {busy && !data && <StandingsSkeleton />}
      {checkingFriends && <StandingsSkeleton />}
      {data && !checkingFriends && (
        <>
          {data.viewer && (
            <div className="leaderboard-viewer">
              <span>{data.viewer.player.name}</span>
              <strong>#{data.viewer.rank}</strong>
            </div>
          )}
          {data.items.length ? (
            <>
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
                      aria-current={
                        row.player.id === owner ? 'true' : undefined
                      }
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
            </>
          ) : (
            <div className="leaderboard-empty">
              <strong>
                {noFriends
                  ? 'Invite friends to compare scores'
                  : mode === 'daily'
                    ? 'No scores for this date'
                    : 'No Training scores yet'}
              </strong>
              {noFriends && (
                <span>Share your link to bring a friend here.</span>
              )}
              {!noFriends && (
                <Link
                  className="game-button leaderboard-empty__action"
                  to={pastDaily ? `/daily/${date}` : '/'}
                  onClick={(event) => {
                    if (
                      event.metaKey ||
                      event.ctrlKey ||
                      event.shiftKey ||
                      event.altKey
                    )
                      return;
                    playSound('tap');
                    if (!pastDaily) onOpenPlay();
                  }}
                >
                  {pastDaily
                    ? 'Open this Daily Challenge'
                    : `Open ${mode === 'daily' ? 'today’s Daily Challenge' : 'Training'}`}
                </Link>
              )}
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
  onOpenPlay,
  initialDate,
  initialScope = 'friends',
  initialMode = 'daily',
  onSelectionChange,
}: {
  catalog?: PokemonCatalog;
  onAccount: () => void;
  onViewPlayer: (id: string) => void;
  onOpenPlay: () => void;
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
  const [inviteError, setInviteError] = useState(false);
  const [standingsError, setStandingsError] = useState('');
  const [shareFallbackLink, setShareFallbackLink] = useState('');
  const [retry, setRetry] = useState(0);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
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
    setStandingsError('');
    onSelectionChange?.(date, next, mode);
  };
  const chooseMode = (next: LeaderboardMode) => {
    setMode(next);
    setStandingsError('');
    onSelectionChange?.(date, scope, next);
  };
  const chooseDate = (next: string) => {
    if (isDailyDate(next) && next <= today) {
      setDate(next);
      setStandingsError('');
      onSelectionChange?.(next, scope, mode);
    }
  };
  return (
    <section
      className="game-panel social-screen"
      aria-labelledby="social-title"
    >
      <header className="game-panel__header leaderboard-header">
        <h1 className="game-panel__title" id="social-title">
          Rankings
        </h1>
        {account.owner && !account.mergeRequired && (
          <div className="leaderboard-header__actions">
            <Link to="/account" className="leaderboard-friends-link">
              Friends list
            </Link>
            <InviteFriends
              owner={account.owner}
              onError={setInviteError}
              retry={retry}
              failed={inviteError}
              onShareFailure={setShareFallbackLink}
            />
          </div>
        )}
      </header>
      <div className="friends-panel">
        {account.owner && !account.mergeRequired ? (
          <>
            {(inviteError || standingsError || shareFallbackLink) && (
              <div className="social-error-banner" role="alert">
                <strong>
                  {shareFallbackLink
                    ? standingsError
                      ? 'Standings and invite sharing unavailable'
                      : 'Could not share invite link'
                    : standingsError && inviteError
                      ? 'Rankings and invite link unavailable'
                      : standingsError
                        ? 'Standings unavailable'
                        : 'Invite link unavailable'}
                </strong>
                {standingsError && <span>{standingsError}</span>}
                {inviteError && (
                  <span>Your invite link could not be loaded.</span>
                )}
                {shareFallbackLink && (
                  <span>Select the link below to copy it.</span>
                )}
                {shareFallbackLink && (
                  <label className="friends-field">
                    Invite link
                    <input
                      readOnly
                      value={shareFallbackLink}
                      onFocus={(event) => event.target.select()}
                    />
                  </label>
                )}
                {(inviteError || standingsError) && (
                  <GameButton
                    tone="quiet"
                    onClick={() => {
                      setInviteError(false);
                      setStandingsError('');
                      setShareFallbackLink('');
                      setRetry((value) => value + 1);
                    }}
                  >
                    Retry
                  </GameButton>
                )}
              </div>
            )}
            <div className="leaderboard-toolbar">
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
                  <div
                    className="leaderboard-scopes"
                    role="group"
                    aria-label="Leaderboard players"
                  >
                    <button
                      type="button"
                      aria-pressed={scope === 'friends'}
                      onClick={() => chooseScope('friends')}
                    >
                      Friends
                    </button>
                    <button
                      type="button"
                      aria-pressed={scope === 'global'}
                      onClick={() => chooseScope('global')}
                    >
                      Global
                    </button>
                  </div>
                </div>
                {mode === 'daily' && (
                  <div className="leaderboard-filter leaderboard-date">
                    <GameButton
                      tone="quiet"
                      aria-label="Previous day"
                      onClick={() => chooseDate(shiftDailyDate(date, -1))}
                    >
                      <ArrowLeftIcon aria-hidden="true" />
                    </GameButton>
                    <input
                      type="date"
                      value={date}
                      max={today}
                      aria-label="Challenge date"
                      onChange={(event) => chooseDate(event.target.value)}
                    />
                    <GameButton
                      tone="quiet"
                      aria-label="Next day"
                      disabled={date >= today}
                      onClick={() => chooseDate(shiftDailyDate(date, 1))}
                    >
                      <ArrowRightIcon aria-hidden="true" />
                    </GameButton>
                  </div>
                )}
              </div>
            </div>
            <div
              className="leaderboard-swipe"
              onTouchStart={(event) => {
                const touch = event.touches.item(0);
                touchStart.current =
                  event.touches.length === 1 && touch
                    ? { x: touch.clientX, y: touch.clientY }
                    : null;
              }}
              onTouchEnd={(event) => {
                const start = touchStart.current;
                touchStart.current = null;
                const touch = event.changedTouches.item(0);
                if (!start || event.changedTouches.length !== 1 || !touch)
                  return;
                const dx = touch.clientX - start.x;
                const dy = touch.clientY - start.y;
                if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5)
                  return;
                if (dx < 0 && scope === 'friends') chooseScope('global');
                if (dx > 0 && scope === 'global') chooseScope('friends');
              }}
              onTouchCancel={() => {
                touchStart.current = null;
              }}
            >
              <Standings
                key={`${account.owner}:${mode}:${mode === 'daily' ? date : ''}:${scope}:${retry}`}
                owner={account.owner}
                catalog={catalog}
                mode={mode}
                date={date}
                scope={scope}
                onViewPlayer={onViewPlayer}
                onOpenPlay={onOpenPlay}
                onError={setStandingsError}
              />
            </div>
          </>
        ) : (
          <div className="social-screen__intro">
            <h2>
              {account.mergeRequired
                ? 'Choose your progress'
                : 'Compare scores'}
            </h2>
            <p>
              {account.mergeRequired
                ? 'Add this browser’s progress or use your account progress before viewing rankings.'
                : 'See Daily and Training rankings for Trainers worldwide or your friends.'}
            </p>
            <GameButton onClick={onAccount}>
              {account.mergeRequired
                ? 'Choose progress'
                : 'Sign in to view rankings'}
            </GameButton>
          </div>
        )}
      </div>
    </section>
  );
}
