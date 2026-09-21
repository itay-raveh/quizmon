import { useState, useSyncExternalStore } from 'react';
import { GameButton } from '../../components/GameButton';
import { ArrowLeftIcon } from '../../components/icons';
import { accountSnapshot, subscribeAccount } from '../account/account';
import { FriendsPanel } from './FriendsPanel';
import './friends.css';

export function FriendsScreen({
  onBack,
  onCloseInvitation,
  onSignIn,
  initialInput = '',
}: {
  onBack: () => void;
  onCloseInvitation: () => void;
  onSignIn: () => void;
  initialInput?: string;
}) {
  const account = useSyncExternalStore(subscribeAccount, accountSnapshot);
  const [adding, setAdding] = useState(Boolean(initialInput));
  return (
    <section className="social-screen" aria-labelledby="friends-title">
      <header className="social-screen__header">
        <GameButton
          className="social-screen__back"
          tone="quiet"
          aria-label="Back to rankings"
          onClick={onBack}
        >
          <ArrowLeftIcon aria-hidden="true" weight="bold" />
        </GameButton>
        <h1 id="friends-title">Friends</h1>
        {account.owner && !account.mergeRequired && (
          <GameButton
            className="social-screen__header-action"
            tone={adding ? 'quiet' : 'primary'}
            onClick={() => {
              if (adding && initialInput) onCloseInvitation();
              else setAdding(!adding);
            }}
          >
            {adding ? 'Your friends' : 'Add friend'}
          </GameButton>
        )}
      </header>
      {account.owner && !account.mergeRequired ? (
        <FriendsPanel
          key={`${account.owner}:${initialInput}`}
          owner={account.owner}
          initialInput={initialInput}
          adding={adding}
        />
      ) : (
        <div className="social-screen__intro">
          <h2>
            {initialInput
              ? 'Someone shared a friend link'
              : 'Play with friends'}
          </h2>
          <p>
            {initialInput
              ? 'Sign in to see their Trainer name. Opening the link does not send a request. You decide whether to ask to connect.'
              : 'Sign in to add friends and compare Daily scores. Requests only become friendships when accepted.'}
          </p>
          <GameButton onClick={onSignIn}>Sign in to continue</GameButton>
          <p className="social-screen__note">
            You can keep playing without an account.
          </p>
        </div>
      )}
    </section>
  );
}
