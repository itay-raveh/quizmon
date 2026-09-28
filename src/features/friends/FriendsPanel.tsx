import { useCallback, useEffect, useRef, useState } from 'react';
import {
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { GameButton } from '../../components/GameButton';
import { Toast } from '../../components/Toast';
import { EyeIcon, ShareNetworkIcon, TrashIcon } from '../../components/icons';
import { useModalDialog } from '../../hooks/useModalDialog';
import {
  formatFriendCode,
  friendInvitePath,
  parseFriendInput,
  type FriendRelation,
  type SocialPlayer,
} from '../../domain/social/friends';
import {
  changeRequest,
  lookupPlayer,
  sendRequest,
  type FriendsPage,
  type PlayerLookup,
} from './friends-client';
import { canShareFriendLink, shareFriendLink } from './friend-sharing';
import { friendsPageQuery, identityQuery } from './social-queries';

const views = ['friends', 'incoming', 'outgoing'] as const;
type View = (typeof views)[number];
const labels = {
  incoming: 'Friend requests',
  friends: 'Your friends',
  outgoing: 'Sent requests',
};
const empty = {
  incoming: 'No incoming requests.',
  friends: 'No friends yet. Share your link to invite someone.',
  outgoing: 'No sent requests.',
};
const errorMessage = (error: unknown) =>
  error instanceof TypeError
    ? 'Could not reach Friends. Check your connection and try again.'
    : error instanceof Error
      ? error.message
      : 'Reconnect and try again.';

function Player({
  player,
  onView,
}: {
  player: SocialPlayer;
  onView?: (id: string) => void;
}) {
  return (
    <div className="friends-player">
      <div className="friends-player__name">
        <strong>{player.name}</strong>
        {onView && (
          <GameButton
            aria-label={`View ${player.name}'s profile`}
            className="friends-icon-button"
            onClick={() => onView(player.id)}
            title={`View ${player.name}'s profile`}
            tone="quiet"
          >
            <EyeIcon aria-hidden="true" weight="regular" />
          </GameButton>
        )}
      </div>
      {player.code && (
        <small className="friends-player__code">
          {formatFriendCode(player.code)}
        </small>
      )}
    </div>
  );
}

function RemoveFriendDialog({
  name,
  onCancel,
  onConfirm,
}: {
  name: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const { dialog, dialogProps, closeDialog } = useModalDialog(onCancel);
  return (
    <dialog
      {...dialogProps}
      aria-describedby="remove-friend-description"
      aria-labelledby="remove-friend-title"
      className="confirm-dialog"
    >
      <div className="confirm-dialog__body">
        <h2 id="remove-friend-title">Remove {name}?</h2>
        <p id="remove-friend-description">
          You will no longer see each other in Friends standings. You can send a
          new request later.
        </p>
        <div className="confirm-dialog__actions">
          <GameButton autoFocus tone="quiet" onClick={closeDialog}>
            Keep friend
          </GameButton>
          <GameButton
            className="confirm-dialog__confirm"
            onClick={() => {
              dialog.current?.close();
              onConfirm();
            }}
          >
            Remove friend
          </GameButton>
        </div>
      </div>
    </dialog>
  );
}

export function FriendsPanel({
  owner,
  initialInput,
  adding,
  onViewPlayer,
  onToggleAdding,
  onOwnCode,
}: {
  owner: string;
  initialInput: string;
  adding: boolean;
  onViewPlayer?: (id: string) => void;
  onToggleAdding: () => void;
  onOwnCode?: (code: string) => void;
}) {
  const queryClient = useQueryClient();
  const identity = useQuery(identityQuery(owner));
  const friends = useInfiniteQuery(friendsPageQuery(owner, 'friends'));
  const incoming = useInfiniteQuery(friendsPageQuery(owner, 'incoming'));
  const outgoing = useInfiniteQuery(friendsPageQuery(owner, 'outgoing'));
  const me = identity.data;
  const pages = Object.fromEntries(
    views.map((view) => {
      const data = { friends, incoming, outgoing }[view].data?.pages;
      return [
        view,
        data
          ? {
              items: data.flatMap((page) => page.items),
              players: data.flatMap((page) => page.players),
              nextCursor: data.at(-1)?.nextCursor ?? null,
            }
          : undefined,
      ];
    }),
  ) as Partial<Record<View, FriendsPage>>;
  const [found, setFound] = useState<PlayerLookup>();
  const [showLink, setShowLink] = useState(false);
  const [lookupRetry, setLookupRetry] = useState(0);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [localError, setError] = useState('');
  const queryError = [identity, friends, incoming, outgoing]
    .map((query) => query.error)
    .find(Boolean);
  const error = localError || (queryError ? errorMessage(queryError) : '');
  const [removing, setRemoving] = useState<{
    row: FriendRelation;
    name: string;
  }>();
  const lifetime = useRef<AbortController | null>(null);
  const sendIds = useRef(new Map<string, string>());
  const foundRegion = useRef<HTMLElement>(null);
  const friendsHeading = useRef<HTMLHeadingElement>(null);
  const revealFound = useRef(false);

  useEffect(() => {
    if (!found || busy || !revealFound.current) return;
    revealFound.current = false;
    foundRegion.current?.focus({ preventScroll: true });
    foundRegion.current?.scrollIntoView({ block: 'center' });
  }, [found, busy]);

  const refresh = useCallback(
    async (signal: AbortSignal) => {
      if (signal.aborted) return;
      await queryClient.invalidateQueries({ queryKey: ['social', owner] });
      setError('');
    },
    [owner, queryClient],
  );

  useEffect(() => {
    const controller = new AbortController();
    lifetime.current = controller;
    return () => controller.abort();
  }, [owner]);

  useEffect(() => {
    if (me) onOwnCode?.(me.code ?? '');
  }, [me, onOwnCode]);

  useEffect(() => {
    const controller = new AbortController();
    if (initialInput) {
      void (async () => {
        const code = parseFriendInput(initialInput, location.origin);
        if (!code)
          throw new Error(
            'Enter the full friend code or a Quizmon friend link.',
          );
        const options = {
          queryKey: ['social', owner, 'lookup', code],
          queryFn: () => lookupPlayer(owner, code),
        };
        if (lookupRetry)
          await queryClient.invalidateQueries({ queryKey: options.queryKey });
        const result = await queryClient.fetchQuery(options);
        if (!controller.signal.aborted) {
          revealFound.current = true;
          setFound(result);
        }
      })().catch((cause: unknown) => {
        if (!controller.signal.aborted) setError(errorMessage(cause));
      });
    }
    return () => controller.abort();
  }, [owner, initialInput, lookupRetry, queryClient]);

  function run(work: (signal: AbortSignal) => Promise<void>) {
    const signal = lifetime.current?.signal;
    if (!signal || signal.aborted || busy) return;
    setBusy(true);
    setError('');
    setNotice('');
    void work(signal)
      .catch((error: unknown) => {
        if (!signal.aborted) setError(errorMessage(error));
      })
      .finally(() => {
        if (!signal.aborted) setBusy(false);
      });
  }

  function change(
    row: FriendRelation,
    action: 'accept' | 'decline' | 'cancel' | 'remove',
  ) {
    run(async (signal) => {
      await changeRequest(owner, row.id, action);
      if (signal.aborted) return;
      if (found?.player.id === row.peerId) setFound(undefined);
      sendIds.current.delete(row.peerId);
      await refresh(signal);
      if (signal.aborted) return;
      setNotice(
        {
          accept: 'Friend request accepted.',
          decline: 'Friend request declined.',
          cancel: 'Friend request cancelled.',
          remove: 'Friend removed.',
        }[action],
      );
      if (action === 'remove')
        requestAnimationFrame(() => friendsHeading.current?.focus());
    });
  }

  function actions(row: FriendRelation, name: string) {
    return (
      <div className="friends-actions">
        {row.status === 'accepted' ? (
          <GameButton
            aria-label={`Remove ${name} as a friend`}
            className="friends-icon-button"
            disabled={busy}
            onClick={() => setRemoving({ row, name })}
            title={`Remove ${name} as a friend`}
            tone="quiet"
          >
            <TrashIcon aria-hidden="true" weight="bold" />
          </GameButton>
        ) : row.direction === 'incoming' ? (
          <>
            <GameButton disabled={busy} onClick={() => change(row, 'accept')}>
              Accept
            </GameButton>
            <GameButton
              tone="quiet"
              disabled={busy}
              onClick={() => change(row, 'decline')}
            >
              Decline
            </GameButton>
          </>
        ) : (
          <GameButton
            tone="quiet"
            disabled={busy}
            onClick={() => change(row, 'cancel')}
          >
            Cancel request
          </GameButton>
        )}
      </div>
    );
  }

  const link = me?.code ? `${location.origin}${friendInvitePath(me.code)}` : '';
  const initialLoading = !pages.friends && !error;
  return (
    <div className="friends-panel">
      {(error || showLink) && (
        <div className="social-error-banner" role="alert">
          <strong>{error || 'Invite link could not be shared.'}</strong>
          {showLink && (
            <label className="friends-field">
              Invite link
              <input
                readOnly
                value={link}
                onFocus={(event) => event.target.select()}
              />
            </label>
          )}
          {error && !busy && (
            <GameButton
              tone="quiet"
              onClick={() => {
                setError('');
                setLookupRetry((n) => n + 1);
                void queryClient.invalidateQueries({
                  queryKey: ['social', owner],
                });
              }}
            >
              Retry
            </GameButton>
          )}
        </div>
      )}
      {initialLoading && (
        <p className="visually-hidden" role="status">
          Loading friends
        </p>
      )}
      {notice && <Toast message={notice} onDismiss={() => setNotice('')} />}
      <div className="friends-panel__heading">
        <h2
          id={adding ? 'add-friend-title' : 'friends-title'}
          className={adding ? undefined : 'visually-hidden'}
          ref={friendsHeading}
          tabIndex={-1}
        >
          {adding ? 'Friend link' : 'Your friends'}
        </h2>
        {adding ? (
          <GameButton tone="quiet" onClick={onToggleAdding}>
            Your friends
          </GameButton>
        ) : (
          <GameButton
            tone="quiet"
            disabled={busy || !link}
            onClick={() =>
              run(async (signal) => {
                setShowLink(false);
                try {
                  const outcome = await shareFriendLink(link);
                  if (!signal.aborted)
                    setNotice(
                      outcome === 'shared'
                        ? 'Friend link shared.'
                        : outcome === 'copied'
                          ? 'Friend link copied.'
                          : '',
                    );
                } catch {
                  if (!signal.aborted) setShowLink(true);
                }
              })
            }
          >
            <ShareNetworkIcon aria-hidden="true" />
            {canShareFriendLink() ? 'Invite friends' : 'Copy invite link'}
          </GameButton>
        )}
      </div>
      {adding && (
        <section className="friends-add" aria-labelledby="add-friend-title">
          <p>
            This link finds a Trainer. It does not send a request until you
            choose to send one.
          </p>
          {initialInput && !found && !error && (
            <div className="friends-link-loading" aria-hidden="true">
              <span className="social-skeleton" />
              <span className="social-skeleton" />
            </div>
          )}
          {found && (
            <section
              className="friends-found"
              aria-label="Found Trainer"
              ref={foundRegion}
              tabIndex={-1}
            >
              <Player player={found.player} onView={onViewPlayer} />
              {found.player.id === owner ? (
                <p>This is you.</p>
              ) : found.request ? (
                <>
                  <p role="status">
                    {found.request.status === 'accepted'
                      ? 'You are friends.'
                      : found.request.direction === 'incoming'
                        ? 'This player sent you a request.'
                        : 'Your request is waiting for acceptance.'}
                  </p>
                  {actions(found.request, found.player.name)}
                </>
              ) : (
                <GameButton
                  disabled={busy}
                  onClick={() =>
                    run(async (signal) => {
                      let id = sendIds.current.get(found.player.id);
                      if (!id) {
                        id = crypto.randomUUID();
                        sendIds.current.set(found.player.id, id);
                      }
                      const request = await sendRequest(
                        owner,
                        found.player.id,
                        id,
                      );
                      if (signal.aborted) return;
                      sendIds.current.delete(found.player.id);
                      if (
                        request.status !== 'pending' &&
                        request.status !== 'accepted'
                      ) {
                        setFound(undefined);
                        await refresh(signal);
                        throw new Error(
                          'That request has already ended. Find the player again to send a new request.',
                        );
                      }
                      setFound({ ...found, request });
                      await refresh(signal);
                    })
                  }
                >
                  Send friend request
                </GameButton>
              )}
            </section>
          )}
        </section>
      )}
      {!adding && initialLoading && (
        <section className="friends-loading" aria-label="Loading your friends">
          <ul className="friends-list" aria-hidden="true">
            {[0, 1, 2].map((row) => (
              <li key={row}>
                <div className="friends-player">
                  <span className="social-skeleton" />
                  <small className="social-skeleton" />
                </div>
                <div className="friends-actions">
                  <span className="social-skeleton" />
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
      {!adding &&
        !initialLoading &&
        views
          .filter(
            (view) => view === 'friends' || Boolean(pages[view]?.items.length),
          )
          .map((view) => (
            <section
              key={view}
              className={`friends-section friends-section--${view}`}
              aria-label={labels[view]}
            >
              {view !== 'friends' && <h2>{labels[view]}</h2>}
              {pages[view] && !pages[view].items.length && (
                <p className="friends-empty">{empty[view]}</p>
              )}
              <ul className="friends-list">
                {pages[view]?.items.map((row) => {
                  const player = pages[view]?.players.find(
                    (player) => player.id === row.peerId,
                  );
                  return (
                    <li key={row.id}>
                      {player && (
                        <Player player={player} onView={onViewPlayer} />
                      )}
                      {actions(row, player?.name ?? 'Trainer')}
                    </li>
                  );
                })}
              </ul>
              {pages[view]?.nextCursor && (
                <GameButton
                  tone="quiet"
                  disabled={busy}
                  onClick={() =>
                    run(async () => {
                      const result = await {
                        friends,
                        incoming,
                        outgoing,
                      }[view].fetchNextPage();
                      if (result.error) throw result.error;
                    })
                  }
                >
                  Load more {labels[view].toLowerCase()}
                </GameButton>
              )}
            </section>
          ))}
      {removing && (
        <RemoveFriendDialog
          name={removing.name}
          onCancel={() => setRemoving(undefined)}
          onConfirm={() => {
            setRemoving(undefined);
            change(removing.row, 'remove');
          }}
        />
      )}
    </div>
  );
}
