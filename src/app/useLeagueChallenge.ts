import { getLeagueLineup } from '@/game/question-history-storage';
import { useCallback } from 'react';
import { getLeagueModifiers } from '@/game/league';
import { createLeagueChallengeSeed } from '@/game/storage';
import type { Modifiers, PokemonCatalog } from '@/game/types';
import type { GameSession, StartGame } from './session';

interface LeagueChallengeOptions {
  catalog?: PokemonCatalog;
  modifiers: Modifiers;
  session: GameSession;
  startGame: StartGame;
}

export const useLeagueChallenge = ({
  catalog,
  modifiers,
  session,
  startGame,
}: LeagueChallengeOptions) => {
  const start = useCallback(() => {
    if (!catalog) return;
    const seed = createLeagueChallengeSeed();
    const leagueModifiers = getLeagueModifiers(modifiers);
    startGame(
      getLeagueLineup(catalog, seed, leagueModifiers),
      leagueModifiers,
      { kind: 'league' },
      seed,
    );
  }, [catalog, modifiers, startGame]);

  const retry = useCallback(() => {
    if (session.phase !== 'results' || session.mode.kind !== 'league') return;
    start();
  }, [session, start]);

  return { retry, start };
};
