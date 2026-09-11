import type { GameSession, StartGame } from '@/app/game-session';
import type { PokemonCatalog } from '@/domain/pokemon/types';
import { getLeagueSettings } from '@/domain/quiz/league';
import { buildLeagueQuestions } from '@/domain/quiz/question-generation';
import type { GameSettings } from '@/domain/settings/types';
import { createRoundSeed } from '@/lib/random';
import { readPlayerSave } from '@/lib/storage/player-storage';
import { useCallback } from 'react';

interface LeagueChallengeOptions {
  catalog?: PokemonCatalog;
  settings: GameSettings;
  session: GameSession;
  startGame: StartGame;
}

export const useLeagueChallenge = ({
  catalog,
  settings,
  session,
  startGame,
}: LeagueChallengeOptions) => {
  const start = useCallback(() => {
    if (!catalog) return;
    const seed = createRoundSeed();
    const leagueSettings = getLeagueSettings(settings);
    startGame(
      buildLeagueQuestions(
        catalog,
        seed,
        leagueSettings,
        readPlayerSave().data.questionHistory,
      ),
      leagueSettings,
      { kind: 'league' },
      seed,
    );
  }, [catalog, settings, startGame]);

  const retry = useCallback(() => {
    if (session.phase !== 'results' || session.mode.kind !== 'league') return;
    start();
  }, [session, start]);

  return { retry, start };
};
