import { buildLeagueQuestions } from '@/game/game';
import { readPlayerSave } from '@/game/player-storage';
import { createRoundSeed } from '@/game/random';
import { useCallback } from 'react';
import { getLeagueModifiers } from '@/game/league';
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
    const seed = createRoundSeed();
    const leagueModifiers = getLeagueModifiers(modifiers);
    startGame(
      buildLeagueQuestions(
        catalog,
        seed,
        leagueModifiers,
        readPlayerSave().data.questionHistory,
      ),
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
