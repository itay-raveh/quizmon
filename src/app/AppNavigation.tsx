import { useSyncExternalStore } from 'react';
import { GameButton } from '../components/GameButton';
import {
  CardholderIcon,
  ChartBarIcon,
  PuzzlePieceIcon,
} from '../components/icons';
import { accountSnapshot, subscribeAccount } from '../features/account/account';
import { SettingsButton } from '../features/settings/SettingsButton';

export type MainDestination = 'play' | 'trainer' | 'leaderboards';

const destinations = [
  ['play', 'Play', PuzzlePieceIcon],
  ['trainer', 'Trainer', CardholderIcon],
  ['leaderboards', 'Leaderboards', ChartBarIcon],
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
      </nav>
      <div className="app-utilities">
        <GameButton
          title={account.owner ? account.status : undefined}
          aria-current={accountOpen ? 'page' : undefined}
          tone={accountOpen ? 'primary' : 'quiet'}
          onClick={onAccount}
        >
          {account.owner
            ? account.error || account.issues.length
              ? 'Review account'
              : 'Account'
            : 'Sign in'}
        </GameButton>
        <SettingsButton disabled={!trainerAvailable} onClick={onSettings} />
      </div>
    </header>
  );
}
