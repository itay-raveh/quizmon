import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import {
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import { GameButton } from '../../components/GameButton';
import { PlayerName } from '../../components/PlayerName';
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
import type {
  Leaderboard,
  LeaderboardMode,
  LeaderboardScope,
} from '../../domain/social/leaderboards';
import { friendInvitePath } from '../../domain/social/friends';
import { accountSnapshot, subscribeAccount } from '../account/account';
import {
  readDailyLeaderboard,
  readTrainingLeaderboard,
} from './leaderboards-client';
import { friendsPageQuery } from './social-queries';
import { canShareFriendLink, shareFriendLink } from './friend-sharing';
import './friends.css';

function InviteFriends({
  owner,
  onShareFailure,
}: {
  owner: string;
  onShareFailure: (link: string) => void;
}) {
  const [message, setMessage] = useState('');
  const link = `${location.origin}${friendInvitePath(owner)}`;
  return (
    <div className="leaderboard-invite">
      <GameButton
        tone="quiet"
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
        <ShareNetworkIcon aria-hidden="true" weight="bold" />
        {canShareFriendLink() ? 'Invite friends' : 'Copy invite link'}
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

function Standings({
  owner,
  mode,
  date,
  scope,
  active,
  pageSize,
  page,
  onPageChange,
  onViewPlayer,
  onError,
}: {
  owner: string;
  mode: LeaderboardMode;
  date: string;
  scope: LeaderboardScope;
  active: boolean;
  pageSize: number;
  page: number;
  onPageChange: (page: number) => void;
  onViewPlayer: (id: string) => void;
  onError: (message: string) => void;
}) {
  const playSound = useInteractionSound();
  const dailyDate = mode === 'daily' ? date : '';
  const after = page > 1 ? String((page - 1) * pageSize) : null;
  const board = useQuery({
    queryKey: [
      'social',
      owner,
      'leaderboard',
      mode,
      dailyDate,
      scope,
      after,
      pageSize,
    ],
    queryFn: async ({ signal }): Promise<Leaderboard> => {
      if (mode === 'daily') {
        return readDailyLeaderboard(
          owner,
          dailyDate,
          scope,
          after,
          pageSize,
          signal,
        );
      }
      return readTrainingLeaderboard(owner, scope, after, pageSize, signal);
    },
    enabled: active,
  });
  const data = board.data;
  const busy = board.isFetching;
  const friends = useInfiniteQuery({
    ...friendsPageQuery(owner, 'friends'),
    enabled: active && scope === 'friends' && data?.items.length === 0,
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
  const load = (nextPage: number) => {
    onPageChange(nextPage);
    onError('');
  };
  const noFriends =
    scope === 'friends' &&
    data?.items.length === 0 &&
    friends.data?.pages[0]?.items.length === 0;
  const checkingFriends =
    scope === 'friends' && data?.items.length === 0 && friends.isPending;
  const showSkeleton = (busy && !data) || checkingFriends;
  const visibleRows = showSkeleton
    ? Array.from({ length: scope === 'friends' ? 3 : pageSize }, () => null)
    : (data?.items ?? []);
  const pastDaily = mode === 'daily' && date < getUtcDate();
  const versionHelpId = `leaderboard-version-help-${scope}`;
  return (
    <section
      className="leaderboard-standings"
      aria-label={`${scope === 'global' ? 'Global' : 'Friends'} ${mode === 'daily' ? 'Daily' : 'Training'} standings`}
      aria-busy={busy || checkingFriends}
      inert={!active}
    >
      {(data || showSkeleton) && (
        <>
          {showSkeleton && (
            <p className="visually-hidden" role="status">
              Loading standings
            </p>
          )}
          {showSkeleton && (
            <div className="leaderboard-viewer" aria-hidden="true">
              <span>
                <Skeleton width="9ch" />
              </span>
              <strong>
                <Skeleton width="3ch" />
              </strong>
            </div>
          )}
          {!showSkeleton && data?.viewer && (
            <div className="leaderboard-viewer">
              <PlayerName trainer={data.viewer.player} />
              <strong>#{data.viewer.rank}</strong>
            </div>
          )}
          {showSkeleton || data?.items.length ? (
            <>
              <table
                className="leaderboard-table"
                aria-hidden={showSkeleton || undefined}
              >
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
                  {visibleRows.map((row, index) => (
                    <tr
                      key={row?.player.id ?? index}
                      data-comparable={row?.comparable}
                      aria-current={
                        row?.player.id === owner && row.comparable
                          ? 'true'
                          : undefined
                      }
                    >
                      <td>
                        {!row ? (
                          <Skeleton width="2ch" />
                        ) : row.comparable ? (
                          row.rank
                        ) : (
                          <SoundButton
                            aria-label={`Why is ${row.player.name}'s score unranked?`}
                            className="leaderboard-version-button"
                            popoverTarget={versionHelpId}
                            popoverTargetAction="show"
                          >
                            <QuestionIcon aria-hidden="true" weight="bold" />
                          </SoundButton>
                        )}
                      </td>
                      <th scope="row">
                        <span className="leaderboard-player">
                          {row ? (
                            <span>
                              <PlayerName trainer={row.player} />
                              {row.player.id === owner ? ' (you)' : ''}
                            </span>
                          ) : (
                            <span>
                              <Skeleton width="8ch" />
                            </span>
                          )}
                          {!row ? (
                            <span className="friends-icon-button game-button game-button--quiet">
                              <Skeleton circle width="1.3rem" height="1.3rem" />
                            </span>
                          ) : row.player.id !== owner ? (
                            <GameButton
                              aria-label={`View ${row.player.name}'s profile`}
                              className="friends-icon-button"
                              onClick={() => onViewPlayer(row.player.id)}
                              title={`View ${row.player.name}'s profile`}
                              tone="quiet"
                            >
                              <EyeIcon aria-hidden="true" weight="bold" />
                            </GameButton>
                          ) : null}
                        </span>
                      </th>
                      <td>
                        <strong>
                          {row ? (
                            row.score.toLocaleString()
                          ) : (
                            <Skeleton width="6ch" />
                          )}
                        </strong>
                        <small>
                          {row ? (
                            `${(row.elapsedMilliseconds / 1000).toFixed(3)}s`
                          ) : (
                            <Skeleton width="5ch" />
                          )}
                        </small>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!showSkeleton && mode === 'daily' && (
                <div
                  className="leaderboard-version-help"
                  id={versionHelpId}
                  popover="auto"
                  role="note"
                >
                  <SoundButton
                    aria-label="Close puzzle version explanation"
                    className="leaderboard-version-help__close"
                    popoverTarget={versionHelpId}
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
              {!noFriends && !pastDaily && (
                <Link
                  className="game-button leaderboard-empty__action"
                  to="/"
                  onClick={(event) => {
                    if (
                      event.metaKey ||
                      event.ctrlKey ||
                      event.shiftKey ||
                      event.altKey
                    )
                      return;
                    playSound('tap');
                  }}
                >
                  {`Open ${mode === 'daily' ? 'today’s Daily Challenge' : 'Training'}`}
                </Link>
              )}
            </div>
          )}
          {data && !showSkeleton && data.items.length > 0 && (
            <p className="social-screen__note">
              {data.total} {data.total === 1 ? 'trainer' : 'trainers'}
            </p>
          )}
          {data && !showSkeleton && (after || data.nextCursor) && (
            <div className="leaderboard-pagination">
              {after && (
                <GameButton
                  tone="quiet"
                  disabled={busy}
                  onClick={() => load(page - 1)}
                >
                  Previous
                </GameButton>
              )}
              <span>
                Page {page} of {Math.ceil(data.total / pageSize)}
              </span>
              {data.nextCursor && (
                <GameButton
                  tone="quiet"
                  disabled={busy}
                  onClick={() => load(page + 1)}
                >
                  Next
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
  onAccount,
  onViewPlayer,
  selectedDate,
  selectedScope = 'friends',
  selectedMode = 'daily',
  selectedPage = 1,
  onSelectionChange,
}: {
  onAccount: () => void;
  onViewPlayer: (id: string) => void;
  selectedDate?: string;
  selectedScope?: LeaderboardScope;
  selectedMode?: LeaderboardMode;
  selectedPage?: number;
  onSelectionChange: (
    date: string,
    scope: LeaderboardScope,
    mode: LeaderboardMode,
    page?: number,
  ) => void;
}) {
  const account = useSyncExternalStore(subscribeAccount, accountSnapshot);
  const queryClient = useQueryClient();
  const [today, setToday] = useState(getUtcDate);
  const scope = selectedScope;
  const mode = selectedMode;
  const date =
    selectedDate && isDailyDate(selectedDate) && selectedDate <= today
      ? selectedDate
      : today;
  const [pageSize, setPageSize] = useState(() =>
    window.matchMedia('(max-width: 42rem)').matches ? 5 : 10,
  );
  useEffect(() => {
    const media = window.matchMedia('(max-width: 42rem)');
    const update = () => setPageSize(media.matches ? 5 : 10);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  const [standingsErrors, setStandingsErrors] = useState({
    friends: '',
    global: '',
  });
  const standingsError = standingsErrors[scope];
  const [shareFallbackLink, setShareFallbackLink] = useState('');
  const swipe = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (account.owner && !account.mergeRequired && swipe.current)
      swipe.current.scrollTo({
        left:
          scope === 'global'
            ? swipe.current.scrollWidth - swipe.current.clientWidth
            : 0,
        behavior: 'instant',
      });
  }, [account.owner, account.mergeRequired, scope]);
  useEffect(() => {
    const timer = window.setInterval(() => {
      const next = getUtcDate();
      if (next !== today) {
        setToday(next);
        if (date === today) {
          onSelectionChange(next, scope, mode);
        }
      }
    }, 30_000);
    return () => window.clearInterval(timer);
  }, [today, date, scope, mode, onSelectionChange]);
  const chooseScope = (next: LeaderboardScope) => {
    if (next === scope) return;
    onSelectionChange(date, next, mode);
  };
  const chooseMode = (next: LeaderboardMode) => {
    setStandingsErrors({ friends: '', global: '' });
    onSelectionChange(date, scope, next);
  };
  const chooseDate = (next: string) => {
    if (isDailyDate(next) && next <= today) {
      setStandingsErrors({ friends: '', global: '' });
      onSelectionChange(next, scope, mode);
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
          <InviteFriends
            owner={account.owner}
            onShareFailure={setShareFallbackLink}
          />
        )}
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
                    <ArrowLeftIcon aria-hidden="true" weight="bold" />
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
                    <ArrowRightIcon aria-hidden="true" weight="bold" />
                  </GameButton>
                </div>
              )}
            </div>
            {(standingsError || shareFallbackLink) && (
              <div className="social-error-banner" role="alert">
                <strong>
                  {shareFallbackLink
                    ? 'Invite link could not be shared.'
                    : standingsError}
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
                {standingsError && (
                  <GameButton
                    tone="quiet"
                    onClick={() => {
                      setStandingsErrors({ friends: '', global: '' });
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
              ref={swipe}
              onScrollEnd={(event) => {
                chooseScope(
                  event.currentTarget.scrollLeft >
                    (event.currentTarget.scrollWidth -
                      event.currentTarget.clientWidth) /
                      2
                    ? 'global'
                    : 'friends',
                );
              }}
            >
              {(['friends', 'global'] as const).map((boardScope) => (
                <Standings
                  key={`${account.owner}:${mode}:${mode === 'daily' ? date : ''}:${boardScope}:${pageSize}`}
                  owner={account.owner}
                  mode={mode}
                  date={date}
                  scope={boardScope}
                  active={scope === boardScope}
                  pageSize={pageSize}
                  page={scope === boardScope ? selectedPage : 1}
                  onPageChange={(page) =>
                    onSelectionChange(date, boardScope, mode, page)
                  }
                  onViewPlayer={onViewPlayer}
                  onError={(message) =>
                    setStandingsErrors((current) =>
                      current[boardScope] === message
                        ? current
                        : { ...current, [boardScope]: message },
                    )
                  }
                />
              ))}
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
