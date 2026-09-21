import { useEffect, useRef, useState } from 'react';
import { GameButton } from '../../components/GameButton';
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

const views = ['incoming', 'friends', 'outgoing'] as const;
type View = (typeof views)[number];
const labels = {
  incoming: 'Incoming requests',
  friends: 'Your friends',
  outgoing: 'Sent requests',
};
const empty = {
  incoming: 'No incoming requests.',
  friends: 'No friends yet. Share your link or enter a friend code.',
  outgoing: 'No sent requests.',
};
const errorMessage = (error: unknown) =>
  error instanceof TypeError
    ? 'Could not reach Friends. Check your connection and try again.'
    : error instanceof Error
      ? error.message
      : 'Reconnect and try again.';

function Player({ player }: { player: SocialPlayer }) {
  return (
    <div className="friends-player">
      <strong>{player.name}</strong>
      {player.code && <small>{formatFriendCode(player.code)}</small>}
    </div>
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
}: {
  owner: string;
  initialInput: string;
}) {
  const [adding, setAdding] = useState(Boolean(initialInput));
  const [me, setMe] = useState<SocialPlayer>();
  const [pages, setPages] = useState<Partial<Record<View, FriendsPage>>>({});
  const [input, setInput] = useState(initialInput);
  const [found, setFound] = useState<PlayerLookup>();
  const [busy, setBusy] = useState(true);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const lifetime = useRef<AbortController | null>(null);
  const sendIds = useRef(new Map<string, string>());
  const foundRegion = useRef<HTMLElement>(null);
  const revealFound = useRef(false);

  useEffect(() => {
    if (!found || busy || !revealFound.current) return;
    revealFound.current = false;
    foundRegion.current?.focus({ preventScroll: true });
    foundRegion.current?.scrollIntoView({ block: 'center' });
  }, [found, busy]);

  async function refresh(signal: AbortSignal) {
    const data = await loadFriends(owner, signal);
    if (signal.aborted) return;
    setMe(data.me);
    setPages(data.pages);
  }

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
      setNotice(
        {
          accept: 'Friend request accepted.',
          decline: 'Friend request declined.',
          cancel: 'Friend request cancelled.',
          remove: 'Friend removed.',
        }[action],
      );
      await refresh(signal);
    });
  }

  function actions(row: FriendRelation) {
    return (
      <div className="friends-actions">
        {row.status === 'accepted' ? (
          <details className="friends-options">
            <summary>Friend options</summary>
            <GameButton
              tone="quiet"
              disabled={busy}
              onClick={() => change(row, 'remove')}
            >
              Remove friend
            </GameButton>
          </details>
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

  const link = me?.code ? `${location.origin}/#friend=${me.code}` : '';
  const initialLoading = busy && !me && !pages.friends && !error;
  return (
    <div className="friends-panel">
      <div className="friends-actions friends-panel__toolbar">
        <GameButton
          tone={adding ? 'quiet' : 'primary'}
          onClick={() => setAdding(!adding)}
        >
          {adding ? 'Back to friends' : 'Add friend'}
        </GameButton>
      </div>
      {error && (
        <p className="settings-error" role="alert">
          {error}
        </p>
      )}
      {busy && (
        <p className="visually-hidden" role="status">
          Loading friends
        </p>
      )}
      {notice && <p role="status">{notice}</p>}
      {adding && (
        <section className="friends-add" aria-labelledby="add-friend-title">
          <h2 id="add-friend-title">Add friend</h2>
          <p>
            Share your link or enter a friend's code. A request needs to be
            accepted before you become friends.
          </p>
          {found && (
            <section aria-label="Found player" ref={foundRegion} tabIndex={-1}>
              <Player player={found.player} />
              {found.player.id === owner ? (
                <p>This is you.</p>
              ) : found.request ? (
                <>
                  <p>
                    {found.request.status === 'accepted'
                      ? 'You are friends.'
                      : found.request.direction === 'incoming'
                        ? 'This player sent you a request.'
                        : 'Your request is waiting for acceptance.'}
                  </p>
                  {actions(found.request)}
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
                      setNotice(
                        request.status === 'accepted'
                          ? 'You are already friends.'
                          : 'Request is pending. The recipient must accept it.',
                      );
                      await refresh(signal);
                    })
                  }
                >
                  Send friend request
                </GameButton>
              )}
            </section>
          )}
          {me && (
            <section aria-label="Your friend details">
              <Player player={me} />
              <label className="friends-field">
                Your friend code
                <input
                  readOnly
                  value={me.code ? formatFriendCode(me.code) : ''}
                  onFocus={(event) => event.target.select()}
                />
              </label>
              <label className="friends-field">
                Your friend link
                <input
                  readOnly
                  value={link}
                  onFocus={(event) => event.target.select()}
                />
              </label>
              <GameButton
                tone="quiet"
                disabled={busy}
                onClick={() =>
                  run(async (signal) => {
                    try {
                      await navigator.clipboard.writeText(link);
                    } catch {
                      throw new Error('Select and copy the friend link above.');
                    }
                    if (!signal.aborted) setNotice('Friend link copied.');
                  })
                }
              >
                Copy friend link
              </GameButton>
            </section>
          )}
          <form
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
            <label className="friends-field">
              Friend code or link
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
              Find player
            </GameButton>
          </form>
        </section>
      )}
      {!adding && initialLoading && (
        <section className="friends-loading" aria-label="Loading your friends">
          <h2>Your friends</h2>
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
            <section key={view} aria-label={labels[view]}>
              <h2>{labels[view]}</h2>
              {pages[view] && !pages[view].items.length && (
                <div>
                  <p>{empty[view]}</p>
                  {view === 'friends' && (
                    <p>
                      Your friends' Daily scores will appear alongside yours on
                      the Friends leaderboard.
                    </p>
                  )}
                </div>
              )}
              <ul className="friends-list">
                {pages[view]?.items.map((row) => {
                  const player = pages[view]?.players.find(
                    (player) => player.id === row.peerId,
                  );
                  return (
                    <li key={row.id}>
                      {player && <Player player={player} />}
                      {actions(row)}
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
      <GameButton
        tone="quiet"
        disabled={busy}
        onClick={() =>
          run(async (signal) => {
            setFound(undefined);
            await refresh(signal);
          })
        }
      >
        Refresh friends
      </GameButton>
    </div>
  );
}
