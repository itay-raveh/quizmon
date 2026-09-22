import { useSyncExternalStore } from 'react';
import { GameButton } from '../components/GameButton';
import {
  CardholderIcon,
  PuzzlePieceIcon,
  UserCircleIcon,
  UsersIcon,
} from '../components/icons';
import { accountSnapshot, subscribeAccount } from '../features/account/account';
import { SettingsButton } from '../features/settings/SettingsButton';
import { BugReportButton } from './BugReportButton';

export type MainDestination = 'play' | 'trainer' | 'social';

const destinations = [
  ['play', 'Play', PuzzlePieceIcon],
  ['trainer', 'Trainer', CardholderIcon],
  ['social', 'Social', UsersIcon],
] as const;

export function AppNavigation({
  active,
  accountOpen,
  loading = false,
  onNavigate,
  onAccount,
  onSettings,
  showNavigation = true,
  trainerAvailable,
}: {
  active: MainDestination | null;
  accountOpen: boolean;
  loading?: boolean;
  onNavigate: (destination: MainDestination) => void;
  onAccount: () => void;
  onSettings: () => void;
  showNavigation?: boolean;
  trainerAvailable: boolean;
}) {
  const account = useSyncExternalStore(subscribeAccount, accountSnapshot);
  return (
    <header className="app-header">
      <SettingsButton disabled={!trainerAvailable} onClick={onSettings} />
      {showNavigation ? (
        <nav className="app-navigation" aria-label="Main" inert={loading}>
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
              <span className="app-navigation__alert" aria-hidden="true">
                !
              </span>
            ) : null}
          </GameButton>
        </nav>
      ) : null}
      <BugReportButton />
    </header>
  );
}
