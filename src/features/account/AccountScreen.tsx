import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useNavigate } from 'react-router';
import { GameButton } from '../../components/GameButton';
import { formatFriendCode } from '../../domain/social/friends';
import { FriendsPanel } from '../friends/FriendsPanel';
import { cachedOwnPlayer } from '../friends/friends-client';
import { useModalDialog } from '../../hooks/useModalDialog';
import {
  readStoredValue,
  removeStoredValue,
} from '../../lib/storage/browser-storage';
import { AccountSettings } from './AccountSettings';
import { accountReturnPath } from './account-navigation';
import {
  accountSnapshot,
  accountWelcomeKey,
  subscribeAccount,
} from './account';

const WelcomeTrainerDialog = ({
  onContinue,
  onEditCard,
}: {
  onContinue: () => void;
  onEditCard: () => void;
}) => {
  const { dialog, dialogProps, closeDialog } = useModalDialog(onContinue);

  return (
    <dialog
      {...dialogProps}
      aria-describedby="welcome-trainer-description"
      aria-labelledby="welcome-trainer-title"
      className="confirm-dialog"
    >
      <div className="confirm-dialog__body">
        <h2 id="welcome-trainer-title">Welcome, Trainer!</h2>
        <p id="welcome-trainer-description">
          Other players can see your Trainer Card. Give it a name.
        </p>
        <div className="confirm-dialog__actions">
          <GameButton
            autoFocus
            onClick={() => {
              dialog.current?.close();
              onEditCard();
            }}
          >
            Edit card
          </GameButton>
          <GameButton tone="quiet" onClick={closeDialog}>
            Continue
          </GameButton>
        </div>
      </div>
    </dialog>
  );
};

export function AccountScreen({
  trainerName,
  onEditCard,
  onViewPlayer,
  friendCode = '',
}: {
  trainerName: string;
  onEditCard: () => void;
  onViewPlayer: (id: string) => void;
  friendCode?: string;
}) {
  const account = useSyncExternalStore(subscribeAccount, accountSnapshot);
  const navigate = useNavigate();
  const signingIn = !account.owner && !account.mergeRequired;
  const hasTrainerName = Boolean(trainerName.trim());
  const [ownCode, setOwnCode] = useState(() => ({
    owner: account.owner,
    code: cachedOwnPlayer(account.owner ?? '')?.code ?? '',
  }));
  const returnPath = friendCode
    ? `/social/friends?code=${friendCode}`
    : accountReturnPath(window.location.href);
  const friendInvitation =
    accountReturnPath(window.location.href).startsWith(
      '/social/friends?code=',
    ) || Boolean(friendCode);
  useEffect(() => {
    if (friendCode && (signingIn || account.mergeRequired))
      void navigate(
        `/account?returnTo=${encodeURIComponent(`/social/friends?code=${friendCode}`)}`,
        { replace: true },
      );
  }, [friendCode, signingIn, account.mergeRequired, navigate]);
  const heading = useRef<HTMLHeadingElement>(null);
  const [welcomeFor] = useState(() =>
    readStoredValue('sessionStorage', accountWelcomeKey),
  );
  const showWelcome =
    Boolean(account.owner) && welcomeFor === account.owner && !hasTrainerName;
  useEffect(() => {
    if (!showWelcome) heading.current?.focus();
  }, [showWelcome]);
  useEffect(() => {
    if (!account.owner || welcomeFor !== account.owner) return;
    removeStoredValue('sessionStorage', accountWelcomeKey);
    if (hasTrainerName) {
      void navigate(returnPath, { replace: true });
    }
  }, [account.owner, hasTrainerName, navigate, returnPath, welcomeFor]);
  return (
    <>
      <section
        className="game-panel account-screen"
        aria-labelledby="account-title"
      >
        <header className="game-panel__header">
          <h1
            className="game-panel__title"
            id="account-title"
            tabIndex={-1}
            ref={heading}
          >
            {signingIn ? 'Sign in' : trainerName.trim() || 'Account'}
          </h1>
          {!signingIn && ownCode.owner === account.owner && ownCode.code && (
            <small className="account-screen__code">
              {formatFriendCode(ownCode.code)}
            </small>
          )}
        </header>
        {signingIn && friendInvitation && (
          <p>
            A Trainer invited you to connect. Sign in or create an account to
            see their profile and choose whether to send a friend request.
          </p>
        )}
        {signingIn || account.mergeRequired ? (
          <AccountSettings />
        ) : (
          <div className="account-screen__sections">
            <details
              className="account-screen__section"
              open={Boolean(account.error)}
            >
              <summary>
                Settings, backup & sign out
                {(account.error || account.offline) && (
                  <small className="account-screen__sync-status">
                    {account.error
                      ? 'Sync needs attention'
                      : 'Waiting for connection'}
                  </small>
                )}
              </summary>
              <AccountSettings />
            </details>
            <details className="account-screen__section" open>
              <summary>Friends</summary>
              <FriendsPanel
                key={`${account.owner}:${friendCode}`}
                owner={account.owner}
                initialInput={friendCode}
                adding={Boolean(friendCode)}
                onToggleAdding={() =>
                  void navigate('/account', { replace: true })
                }
                onViewPlayer={onViewPlayer}
                onOwnCode={(code) => setOwnCode({ owner: account.owner, code })}
              />
            </details>
          </div>
        )}
      </section>
      {showWelcome ? (
        <WelcomeTrainerDialog
          onEditCard={onEditCard}
          onContinue={() => {
            void navigate(returnPath, {
              replace: true,
            });
          }}
        />
      ) : null}
    </>
  );
}
