import { useSyncExternalStore } from 'react';
import { Link, useLocation } from 'react-router';
import { GameButton } from '../components/GameButton';
import { useInteractionSound } from '../lib/audio/sound-context';
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
  onSettings,
  socialPath = '/social/rankings',
  showNavigation = true,
  trainerAvailable,
}: {
  active: MainDestination | null;
  accountOpen: boolean;
  loading?: boolean;
  onNavigate: (destination: MainDestination) => void;
  onSettings: () => void;
  socialPath?: string;
  showNavigation?: boolean;
  trainerAvailable: boolean;
}) {
  const account = useSyncExternalStore(subscribeAccount, accountSnapshot);
  const location = useLocation();
  const playSound = useInteractionSound();
  const paths = { play: '/', trainer: '/trainer', social: socialPath };
  const accountPath = accountOpen
    ? `${location.pathname}${location.search}${location.hash}`
    : `/account?returnTo=${encodeURIComponent(`${location.pathname}${location.search}${location.hash}`)}`;
  return (
    <header className="app-header">
      <SettingsButton disabled={!trainerAvailable} onClick={onSettings} />
      {showNavigation ? (
        <nav className="app-navigation" aria-label="Main" inert={loading}>
          {destinations.map(([destination, label, Icon]) =>
            destination === 'trainer' && !trainerAvailable ? (
              <GameButton key={destination} disabled tone="quiet">
                <Icon aria-hidden="true" weight="bold" />
                {label}
              </GameButton>
            ) : (
              <Link
                key={destination}
                to={paths[destination]}
                aria-current={active === destination ? 'page' : undefined}
                className={`game-button game-button--${active === destination ? 'primary' : 'quiet'}`}
                onClick={(event) => {
                  if (
                    event.metaKey ||
                    event.ctrlKey ||
                    event.shiftKey ||
                    event.altKey
                  )
                    return;
                  if (
                    paths[destination] ===
                    `${location.pathname}${location.search}`
                  ) {
                    event.preventDefault();
                    if (destination === 'play') onNavigate(destination);
                    return;
                  }
                  playSound('tap');
                  onNavigate(destination);
                }}
              >
                <Icon aria-hidden="true" weight="bold" />
                {label}
              </Link>
            ),
          )}
          <Link
            to={accountPath}
            aria-label={
              account.owner && (account.error || account.issues.length)
                ? 'Account, sync needs attention'
                : undefined
            }
            aria-current={accountOpen ? 'page' : undefined}
            className={`game-button game-button--${accountOpen ? 'primary' : 'quiet'} app-navigation__account`}
            onClick={(event) => {
              if (accountOpen) event.preventDefault();
              else playSound('tap');
            }}
          >
            <UserCircleIcon aria-hidden="true" weight="bold" />
            {account.owner ? 'Account' : 'Sign in'}
            {account.owner && (account.error || account.issues.length) ? (
              <span className="app-navigation__alert" aria-hidden="true">
                !
              </span>
            ) : null}
          </Link>
        </nav>
      ) : null}
      <BugReportButton />
    </header>
  );
}
