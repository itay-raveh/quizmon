import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useNavigate } from 'react-router';
import { GameButton } from '../../components/GameButton';
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
  useEffect(() => heading.current?.focus(), []);
  useEffect(() => {
    if (!account.owner || welcomeFor !== account.owner) return;
    removeStoredValue('sessionStorage', accountWelcomeKey);
    if (hasTrainerName) {
      void navigate(accountReturnPath(window.location.href), { replace: true });
    }
  }, [account.owner, hasTrainerName, navigate, welcomeFor]);
  const showWelcome = welcomeFor === account.owner && !hasTrainerName;

  return (
    <section
      className="game-panel account-screen"
      aria-labelledby="account-title"
    >
      <header className="account-screen__header">
        <h1
          className="game-panel__title"
          id="account-title"
          tabIndex={-1}
          ref={heading}
        >
          {signingIn ? 'Sign in' : 'Account'}
        </h1>
      </header>
      {showWelcome && (
        <section className="account-screen__welcome" aria-label="Welcome">
          <h2>Welcome, Trainer!</h2>
          <p>Other players can see your Trainer Card. Give it a name.</p>
          <div className="account-settings__actions">
            <GameButton onClick={onEditCard}>Edit card</GameButton>
            <GameButton
              tone="quiet"
              onClick={() => {
                void navigate(accountReturnPath(window.location.href), {
                  replace: true,
                });
              }}
            >
              Continue
            </GameButton>
          </div>
        </section>
      )}
      <AccountSettings />
    </section>
  );
}
