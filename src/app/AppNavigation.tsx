import { useSyncExternalStore } from 'react';
import { GameButton } from '../components/GameButton';
import {
  CardholderIcon,
  ChartBarIcon,
  PuzzlePieceIcon,
  UserCircleIcon,
} from '../components/icons';
import { accountSnapshot, subscribeAccount } from '../features/account/account';
import { SettingsButton } from '../features/settings/SettingsButton';

export type MainDestination = 'play' | 'trainer' | 'leaderboards';

const destinations = [
  ['play', 'Play', PuzzlePieceIcon],
  ['trainer', 'Trainer', CardholderIcon],
  ['leaderboards', 'Rankings', ChartBarIcon],
] as const;

export function AppNavigation({
  active,
  accountOpen,
  onNavigate,
  onAccount,
  onSettings,
  trainerAvailable,
}: {
  active: MainDestination | null;
  accountOpen: boolean;
  onNavigate: (destination: MainDestination) => void;
  onAccount: () => void;
  onSettings: () => void;
  trainerAvailable: boolean;
}) {
  const account = useSyncExternalStore(subscribeAccount, accountSnapshot);
  return (
    <header className="app-header">
      <SettingsButton disabled={!trainerAvailable} onClick={onSettings} />
      <nav className="app-navigation" aria-label="Main">
        {destinations.map(([destination, label, Icon]) => (
          <GameButton
            key={destination}
            aria-current={active === destination ? 'page' : undefined}
            disabled={destination === 'trainer' && !trainerAvailable}
            tone={active === destination ? 'primary' : 'quiet'}
            onClick={() => onNavigate(destination)}
          >
            <Icon aria-hidden="true" weight="bold" />
            {label}
          </GameButton>
        ))}
        <GameButton
          aria-label={
            account.owner && (account.error || account.issues.length)
              ? 'Account, sync needs attention'
              : undefined
          }
          aria-current={accountOpen ? 'page' : undefined}
          className="app-navigation__account"
          tone={accountOpen ? 'primary' : 'quiet'}
          onClick={onAccount}
        >
          <UserCircleIcon aria-hidden="true" weight="bold" />
          {account.owner ? 'Account' : 'Sign in'}
          {account.owner && (account.error || account.issues.length) ? (
            <span className="app-navigation__alert" aria-hidden="true" />
          ) : null}
        </GameButton>
      </nav>
    </header>
  );
}
