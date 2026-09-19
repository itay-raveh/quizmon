import { useEffect, useRef, useSyncExternalStore } from 'react';
import { GameButton } from '../../components/GameButton';
import { ArrowLeftIcon } from '../../components/icons';
import { AccountSettings } from './AccountSettings';
import { accountSnapshot, subscribeAccount } from './account';

export function AccountScreen({
  onBack,
  onComplete,
}: {
  onBack: () => void;
  onComplete?: () => void;
}) {
  const account = useSyncExternalStore(subscribeAccount, accountSnapshot);
  const signingIn = !account.owner && !account.mergeRequired;
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => heading.current?.focus(), []);

  return (
    <section
      className={`account-screen${signingIn ? ' account-screen--sign-in' : ''}`}
      aria-labelledby="account-title"
    >
      <header className="account-screen__header">
        <GameButton tone="quiet" aria-label="Back" onClick={onBack}>
          <ArrowLeftIcon aria-hidden="true" weight="bold" />
        </GameButton>
        <h1 id="account-title" tabIndex={-1} ref={heading}>
          {signingIn ? 'Sign in' : 'Account'}
        </h1>
      </header>
      <AccountSettings onComplete={onComplete} />
    </section>
  );
}
