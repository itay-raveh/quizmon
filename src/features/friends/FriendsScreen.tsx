import { useSyncExternalStore } from 'react';
import { GameButton } from '../../components/GameButton';
import { ArrowLeftIcon } from '../../components/icons';
import { accountSnapshot, subscribeAccount } from '../account/account';
import { FriendsPanel } from './FriendsPanel';
import './friends.css';

export function FriendsScreen({
  onBack,
  initialInput = '',
}: {
  onBack: () => void;
  initialInput?: string;
}) {
  const account = useSyncExternalStore(subscribeAccount, accountSnapshot);
  return (
    <section className="social-screen" aria-labelledby="friends-title">
      <header className="social-screen__header">
        <GameButton tone="quiet" aria-label="Back" onClick={onBack}>
          <ArrowLeftIcon aria-hidden="true" weight="bold" />
        </GameButton>
        <h1 id="friends-title">Friends</h1>
      </header>
      {account.owner && !account.mergeRequired ? (
        <FriendsPanel
          key={`${account.owner}:${initialInput}`}
          owner={account.owner}
          initialInput={initialInput}
        />
      ) : (
        <div className="social-screen__intro">
          <h2>
            {initialInput
              ? 'Open your friend invitation'
              : 'Compare scores with friends'}
          </h2>
          <p>
            {initialInput
              ? 'Sign in to view this Trainer and send a friend request.'
              : 'Add friends to see your Daily scores together. Both players choose to accept a friendship.'}
          </p>
          <p>
            Your Trainer name and partner Pokémon are visible to other players.
            Your email stays private.
          </p>
          <p>Use Sign in in the header to get started.</p>
          <p className="social-screen__note">
            You can keep playing without an account.
          </p>
        </div>
      )}
    </section>
  );
}
