import { useState, useSyncExternalStore } from 'react';
import { GameButton } from '../../components/GameButton';
import { accountSnapshot, subscribeAccount } from '../account/account';
import { FriendsPanel } from './FriendsPanel';
import { SocialSections } from './SocialSections';
import './friends.css';

export function FriendsScreen({
  onRankings,
  onCloseInvitation,
  onSignIn,
  initialInput = '',
}: {
  onRankings: () => void;
  onCloseInvitation: () => void;
  onSignIn: () => void;
  initialInput?: string;
}) {
  const account = useSyncExternalStore(subscribeAccount, accountSnapshot);
  const [adding, setAdding] = useState(Boolean(initialInput));
  return (
    <section className="social-screen" aria-labelledby="social-title">
      <header className="social-screen__header">
        <h1 id="social-title">Social</h1>
      </header>
      <SocialSections active="friends" onRankings={onRankings} />
      {account.owner && !account.mergeRequired && (
        <div className="social-screen__actions">
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
        </div>
      )}
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
