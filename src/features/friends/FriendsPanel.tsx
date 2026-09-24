import { useCallback, useEffect, useRef, useState } from 'react';
import { GameButton } from '../../components/GameButton';
import { SoundButton } from '../../components/SoundButton';
import { Toast } from '../../components/Toast';
import { EyeIcon, TrashIcon } from '../../components/icons';
import { useModalDialog } from '../../hooks/useModalDialog';
import {
  formatFriendCode,
  parseFriendInput,
  type FriendRelation,
  type SocialPlayer,
} from '../../domain/social/friends';
import {
  changeRequest,
  friendPage,
  lookupPlayer,
  ownPlayer,
  sendRequest,
  type FriendsPage,
  type PlayerLookup,
} from './friends-client';
import { canShareFriendLink, shareFriendLink } from './friend-sharing';

const views = ['friends', 'incoming', 'outgoing'] as const;
type View = (typeof views)[number];
const labels = {
  incoming: 'Friend requests',
  friends: 'Your friends',
  outgoing: 'Sent requests',
};
const empty = {
  incoming: 'No incoming requests.',
  friends: 'No friends yet. Use Add friend to connect with someone.',
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
      {player.code && <small>{formatFriendCode(player.code)}</small>}
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

async function loadFriends(owner: string, signal: AbortSignal) {
  const [me, ...lists] = await Promise.all([
    ownPlayer(owner, signal),
    ...views.map((view) => friendPage(owner, view, undefined, signal)),
  ]);
  return {
    me,
    pages: Object.fromEntries(
      views.map((view, i) => [view, lists[i]]),
    ) as Record<View, FriendsPage>,
  };
}

export function FriendsPanel({
  owner,
  initialInput,
  adding,
  onViewPlayer,
  onToggleAdding,
}: {
  owner: string;
  initialInput: string;
  adding: boolean;
  onViewPlayer?: (id: string) => void;
  onToggleAdding: () => void;
}) {
  const [me, setMe] = useState<SocialPlayer>();
  const [pages, setPages] = useState<Partial<Record<View, FriendsPage>>>({});
  const [input, setInput] = useState(initialInput);
  const [found, setFound] = useState<PlayerLookup>();
  const [busy, setBusy] = useState(true);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [removing, setRemoving] = useState<{
    row: FriendRelation;
    name: string;
  }>();
  const lifetime = useRef<AbortController | null>(null);
  const sendIds = useRef(new Map<string, string>());
  const foundRegion = useRef<HTMLElement>(null);
  const addHeading = useRef<HTMLHeadingElement>(null);
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
      const data = await loadFriends(owner, signal);
      if (signal.aborted) return;
      setMe(data.me);
      setPages(data.pages);
      setError('');
    },
    [owner],
  );

  useEffect(() => {
    const controller = new AbortController();
    lifetime.current = controller;
    void loadFriends(owner, controller.signal)
      .then(async (data) => {
        if (controller.signal.aborted) return;
        setMe(data.me);
        setPages(data.pages);
        if (!initialInput || controller.signal.aborted) return;
        const code = parseFriendInput(initialInput, location.origin);
        if (!code)
          throw new Error(
            'Enter the full friend code or a Quizmon friend link.',
          );
        const result = await lookupPlayer(owner, code, controller.signal);
        if (!controller.signal.aborted) setFound(result);
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setError(errorMessage(error));
      })
      .finally(() => {
        if (!controller.signal.aborted) setBusy(false);
      });
    return () => controller.abort();
  }, [owner, initialInput]);

  useEffect(() => {
    const controller = new AbortController();
    let refreshing = false;
    const update = () => {
      if (
        busy ||
        refreshing ||
        document.visibilityState !== 'visible' ||
        !navigator.onLine
      )
        return;
      refreshing = true;
      void refresh(controller.signal)
        .catch((cause: unknown) => {
          if (!controller.signal.aborted) setError(errorMessage(cause));
        })
        .finally(() => {
          refreshing = false;
        });
    };
    const timer = window.setInterval(update, 60_000);
    document.addEventListener('visibilitychange', update);
    window.addEventListener('online', update);
    return () => {
      controller.abort();
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', update);
      window.removeEventListener('online', update);
    };
  }, [busy, refresh]);

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
        requestAnimationFrame(() =>
          (adding ? addHeading : friendsHeading).current?.focus(),
        );
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

  const link = me?.code
    ? `${location.origin}/social/friends?code=${me.code}`
    : '';
  const initialLoading = busy && !me && !pages.friends && !error;
  return (
    <div className="friends-panel">
      {error && (
        <p className="settings-error" role="alert">
          {error}
        </p>
      )}
      {error && !me && !busy && (
        <GameButton tone="quiet" onClick={() => run(refresh)}>
          Retry
        </GameButton>
      )}
      {busy && (
        <p className="visually-hidden" role="status">
          Loading friends
        </p>
      )}
      {notice && <Toast message={notice} onDismiss={() => setNotice('')} />}
      <div className="friends-panel__heading">
        <h2
          id={adding ? 'add-friend-title' : 'friends-title'}
          ref={adding ? addHeading : friendsHeading}
          tabIndex={-1}
        >
          {adding
            ? initialInput
              ? 'Friend link'
              : 'Add a friend'
            : 'Your friends'}
        </h2>
        <SoundButton className="friends-panel__switch" onClick={onToggleAdding}>
          {adding ? 'Your friends' : 'Add friend'}
        </SoundButton>
      </div>
      {adding && (
        <section className="friends-add" aria-labelledby="add-friend-title">
          {initialInput && (
            <p>
              This link finds a Trainer. It does not send a request until you
              choose to send one.
            </p>
          )}
          {initialInput && busy && !found && (
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
          {(!initialInput || Boolean(error)) && (
            <form
              className="friends-add__find"
              onSubmit={(event) => {
                event.preventDefault();
                run(async (signal) => {
                  setFound(undefined);
                  const code = parseFriendInput(input, location.origin);
                  if (!code)
                    throw new Error(
                      'Enter the full friend code or a Quizmon friend link.',
                    );
                  const result = await lookupPlayer(owner, code, signal);
                  if (!signal.aborted) {
                    revealFound.current = true;
                    setFound(result);
                  }
                });
              }}
            >
              <h3>Find a Trainer</h3>
              <label className="friends-field">
                Their friend code or link
                <input
                  value={input}
                  maxLength={2048}
                  autoComplete="off"
                  spellCheck={false}
                  disabled={busy}
                  onChange={(event) => {
                    setInput(event.target.value);
                    setFound(undefined);
                  }}
                />
              </label>
              <GameButton type="submit" disabled={busy || !input.trim()}>
                Find Trainer
              </GameButton>
            </form>
          )}
          {!initialInput && me && (
            <section
              className="friends-add__share"
              aria-label="Share your link"
            >
              <h3>Share your link</h3>
              <GameButton
                tone="quiet"
                disabled={busy}
                onClick={() =>
                  run(async (signal) => {
                    const outcome = await shareFriendLink(link);
                    if (!signal.aborted)
                      setNotice(
                        outcome === 'shared'
                          ? 'Friend link shared.'
                          : outcome === 'copied'
                            ? 'Friend link copied.'
                            : '',
                      );
                  })
                }
              >
                {canShareFriendLink() ? 'Share my link' : 'Copy my link'}
              </GameButton>
              <details className="friends-code">
                <summary>Show link and code</summary>
                <label className="friends-field">
                  Your link
                  <input
                    readOnly
                    value={link}
                    onFocus={(event) => event.target.select()}
                  />
                </label>
                <label className="friends-field">
                  Your friend code
                  <input
                    readOnly
                    value={me.code ? formatFriendCode(me.code) : ''}
                    onFocus={(event) => event.target.select()}
                  />
                </label>
              </details>
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
                    run(async (signal) => {
                      const old = pages[view]!;
                      const next = await friendPage(
                        owner,
                        view,
                        old.nextCursor!,
                        signal,
                      );
                      if (!signal.aborted)
                        setPages((pages) => ({
                          ...pages,
                          [view]: {
                            ...next,
                            items: [...old.items, ...next.items],
                            players: [...old.players, ...next.players],
                          },
                        }));
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
