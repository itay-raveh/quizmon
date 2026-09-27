import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import {
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { Link } from 'react-router';
import { GameButton } from '../../components/GameButton';
import { SoundButton } from '../../components/SoundButton';
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  EyeIcon,
  QuestionIcon,
  ShareNetworkIcon,
  XIcon,
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
import { friendsPageQuery, identityQuery } from './social-queries';
import { canShareFriendLink, shareFriendLink } from './friend-sharing';
import './friends.css';

function InviteFriends({
  owner,
  onError,
  failed,
  onShareFailure,
}: {
  owner: string;
  onError: (failed: boolean) => void;
  failed: boolean;
  onShareFailure: (link: string) => void;
}) {
  const identity = useQuery(identityQuery(owner));
  const code = identity.data?.code ?? '';
  const [message, setMessage] = useState('');
  useEffect(() => {
    onError(identity.isError || (identity.isSuccess && !code));
  }, [identity.isError, identity.isSuccess, code, onError]);
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
  const [after, setAfter] = useState<string | null>(null);
  let savedId: string | undefined;
  if (mode === 'daily') {
    try {
      savedId = readDailyResult(dailyDate, currentDailyTrack)?.puzzleId;
    } catch {
      // The leaderboard can load before the local save opens.
    }
  }
  const board = useQuery({
    queryKey: [
      'social',
      owner,
      'leaderboard',
      mode,
      dailyDate,
      scope,
      savedId,
      after,
    ],
    queryFn: async (): Promise<Leaderboard> => {
      if (mode === 'daily') {
        if (!savedId && !dailyCatalog)
          throw new Error('Daily catalog is unavailable.');
        return readDailyLeaderboard(
          owner,
          dailyDate,
          scope,
          savedId ?? (await getDailyPuzzleId(dailyCatalog!, dailyDate)),
          after,
        );
      }
      return readTrainingLeaderboard(owner, scope, after);
    },
    refetchInterval: 60_000,
  });
  const data = board.data;
  const busy = board.isFetching;
  const friends = useInfiniteQuery({
    ...friendsPageQuery(owner, 'friends'),
    enabled: scope === 'friends' && data?.items.length === 0,
  });
  useEffect(() => {
    const cause = board.error ?? (scope === 'friends' ? friends.error : null);
    onError(
      cause
        ? cause instanceof TypeError
          ? 'Could not reach the leaderboard. Check your connection and try again.'
          : cause instanceof Error
            ? cause.message
            : 'Could not load the leaderboard.'
        : '',
    );
  }, [board.error, friends.error, scope, onError]);
  const load = (after: string | null) => {
    setAfter(after);
    onError('');
  };
  const noFriends =
    scope === 'friends' &&
    data?.items.length === 0 &&
    friends.data?.pages[0]?.items.length === 0;
  const checkingFriends =
    scope === 'friends' && data?.items.length === 0 && friends.isPending;
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
                      data-comparable={row.comparable}
                      aria-current={
                        row.player.id === owner && row.comparable
                          ? 'true'
                          : undefined
                      }
                    >
                      <td>
                        {row.comparable ? (
                          row.rank
                        ) : (
                          <SoundButton
                            aria-label={`Why is ${row.player.name}'s score unranked?`}
                            className="leaderboard-version-button"
                            popoverTarget="leaderboard-version-help"
                            popoverTargetAction="show"
                          >
                            <QuestionIcon aria-hidden="true" weight="bold" />
                          </SoundButton>
                        )}
                      </td>
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
              {mode === 'daily' && (
                <div
                  className="leaderboard-version-help"
                  id="leaderboard-version-help"
                  popover="auto"
                  role="note"
                >
                  <SoundButton
                    aria-label="Close puzzle version explanation"
                    className="leaderboard-version-help__close"
                    popoverTarget="leaderboard-version-help"
                    popoverTargetAction="hide"
                  >
                    <XIcon aria-hidden="true" weight="bold" />
                  </SoundButton>
                  <strong>Another puzzle version</strong>
                  <p>
                    An update can change the Daily puzzle. Scores from different
                    versions stay visible, but do not share a rank.
                  </p>
                </div>
              )}
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
          {(after || data.nextCursor) && (
            <div className="friends-actions">
              {after && (
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
  const queryClient = useQueryClient();
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
      </header>
      <div className="friends-panel">
        {account.owner && !account.mergeRequired ? (
          <>
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
              <div className="leaderboard-filter leaderboard-filter--players">
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
                <InviteFriends
                  owner={account.owner}
                  onError={setInviteError}
                  failed={inviteError}
                  onShareFailure={setShareFallbackLink}
                />
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
            {(inviteError || standingsError || shareFallbackLink) && (
              <div className="social-error-banner" role="alert">
                <strong>
                  {shareFallbackLink
                    ? 'Invite link could not be shared.'
                    : standingsError && inviteError
                      ? 'Rankings and invite links could not load.'
                      : standingsError
                        ? standingsError
                        : 'Invite link could not load.'}
                </strong>
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
                      void queryClient.invalidateQueries({
                        queryKey: ['social', account.owner],
                      });
                    }}
                  >
                    Retry
                  </GameButton>
                )}
              </div>
            )}
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
                key={`${account.owner}:${mode}:${mode === 'daily' ? date : ''}:${scope}`}
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
