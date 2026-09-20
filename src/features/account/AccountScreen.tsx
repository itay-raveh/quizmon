import { useEffect, useRef, useSyncExternalStore } from 'react';
import { AccountSettings } from './AccountSettings';
import { accountSnapshot, subscribeAccount } from './account';

export function AccountScreen() {
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
        <h1 id="account-title" tabIndex={-1} ref={heading}>
          {signingIn ? 'Sign in' : 'Account'}
        </h1>
      </header>
      <AccountSettings />
    </section>
  );
}
