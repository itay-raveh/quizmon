import { useCallback } from 'react';
import {
  buildLeagueQuestions,
  getLeagueModifiers,
  isLeagueVictory,
} from '@/game/league';
import { getLeagueChallengeSeed } from '@/game/storage';
import type {
  GameMode,
  Modifiers,
  PokemonCatalog,
  QuestionData,
} from '@/game/types';
import type { GameSession } from './session';

interface LeagueChallengeOptions {
  catalog?: PokemonCatalog;
  modifiers: Modifiers;
  session: GameSession;
  startGame: (
    questions: QuestionData[],
    modifiers: Modifiers,
    mode: GameMode,
    seed: string,
  ) => void;
}

export const useLeagueChallenge = ({
  catalog,
  modifiers,
  session,
  startGame,
}: LeagueChallengeOptions) => {
  const startWithSeed = useCallback(
    (seed: string) => {
      if (!catalog) return;
      const leagueModifiers = getLeagueModifiers(modifiers);
      startGame(
        buildLeagueQuestions(catalog, seed, leagueModifiers),
        leagueModifiers,
        { kind: 'league' },
        seed,
      );
    },
    [catalog, modifiers, startGame],
  );

  const start = useCallback(() => {
    startWithSeed(getLeagueChallengeSeed());
  }, [startWithSeed]);

  const retry = useCallback(() => {
    if (session.phase !== 'results' || session.mode.kind !== 'league') return;
    startWithSeed(
      isLeagueVictory(session.result) ? getLeagueChallengeSeed() : session.seed,
    );
  }, [session, startWithSeed]);

  return { retry, start };
};
