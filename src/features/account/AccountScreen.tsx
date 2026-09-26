import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useNavigate } from 'react-router';
import { GameButton } from '../../components/GameButton';
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
  hasTrainerName,
  onEditCard,
}: {
  hasTrainerName: boolean;
  onEditCard: () => void;
}) {
  const account = useSyncExternalStore(subscribeAccount, accountSnapshot);
  const navigate = useNavigate();
  const signingIn = !account.owner && !account.mergeRequired;
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
      void navigate(accountReturnPath(window.location.href), { replace: true });
    }
  }, [account.owner, hasTrainerName, navigate, welcomeFor]);
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
            {signingIn ? 'Sign in' : 'Account'}
          </h1>
        </header>
        <AccountSettings />
      </section>
      {showWelcome ? (
        <WelcomeTrainerDialog
          onEditCard={onEditCard}
          onContinue={() => {
            void navigate(accountReturnPath(window.location.href), {
              replace: true,
            });
          }}
        />
      ) : null}
    </>
  );
}
