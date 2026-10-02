import { useSyncExternalStore } from 'react';
import { Link, useLocation } from '@tanstack/react-router';
import { GameButton } from '../components/GameButton';
import { useInteractionSound } from '../lib/audio/sound-context';
import {
  CardholderIcon,
  ChartBarIcon,
  PuzzlePieceIcon,
  UserCircleIcon,
} from '../components/icons';
import { accountSnapshot, subscribeAccount } from '../features/account/account';
import { SettingsButton } from '../features/settings/SettingsButton';
import { FeedbackButton } from './FeedbackButton';

export type MainDestination = 'play' | 'trainer' | 'rankings';

const destinations = [
  ['play', 'Play', PuzzlePieceIcon],
  ['trainer', 'Trainer', CardholderIcon],
  ['rankings', 'Rankings', ChartBarIcon],
] as const;

export const AppNavigationLoading = () => (
  <header className="app-header">
    <SettingsButton disabled onClick={() => {}} />
    <nav className="app-navigation" aria-label="Main" inert>
      {destinations.map(([destination, label, Icon]) => (
        <GameButton key={destination} disabled tone="quiet">
          <Icon aria-hidden="true" weight="bold" />
          {label}
        </GameButton>
      ))}
      <GameButton disabled tone="quiet" className="app-navigation__account">
        <UserCircleIcon aria-hidden="true" weight="bold" />
        Sign in
      </GameButton>
    </nav>
    <FeedbackButton />
  </header>
);

export function AppNavigation({
  active,
  accountOpen,
  loading = false,
  onNavigate,
  onSettings,
  rankingsDate,
  showNavigation = true,
  trainerAvailable,
}: {
  active: MainDestination | null;
  accountOpen: boolean;
  loading?: boolean;
  onNavigate: (destination: MainDestination) => void;
  onSettings: () => void;
  rankingsDate?: string;
  showNavigation?: boolean;
  trainerAvailable: boolean;
}) {
  const account = useSyncExternalStore(subscribeAccount, accountSnapshot);
  const location = useLocation();
  const playSound = useInteractionSound();
  const paths = {
    play: '/',
    trainer: '/trainer',
    rankings: '/rankings',
  } as const;
  const accountOrigin = `${location.pathname}${location.searchStr}${location.hash}`;
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
                search={
                  destination === 'rankings' && rankingsDate
                    ? { date: rankingsDate }
                    : {}
                }
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
                    `${paths[destination]}${destination === 'rankings' && rankingsDate ? `?date=${rankingsDate}` : ''}` ===
                    `${location.pathname}${location.searchStr}`
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
            to="/account"
            search={{
              returnTo:
                accountOpen && location.pathname === '/account'
                  ? undefined
                  : accountOrigin,
            }}
            aria-label={
              account.owner && account.error
                ? 'Account, sync needs attention'
                : undefined
            }
            aria-current={accountOpen ? 'page' : undefined}
            className={`game-button game-button--${accountOpen ? 'primary' : 'quiet'} app-navigation__account`}
            onClick={(event) => {
              if (
                event.metaKey ||
                event.ctrlKey ||
                event.shiftKey ||
                event.altKey
              )
                return;
              if (accountOpen && location.pathname === '/account')
                event.preventDefault();
              else playSound('tap');
            }}
          >
            <UserCircleIcon aria-hidden="true" weight="bold" />
            {account.owner ? 'Account' : 'Sign in'}
            {account.owner && account.error ? (
              <span className="app-navigation__alert" aria-hidden="true">
                !
              </span>
            ) : null}
          </Link>
        </nav>
      ) : null}
      <FeedbackButton />
    </header>
  );
}
