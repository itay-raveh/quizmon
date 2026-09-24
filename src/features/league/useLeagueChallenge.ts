import { useCallback } from 'react';
import type { StartGame } from '../../app/game-session';
import type { PokemonCatalog } from '../../domain/pokemon/types';
import { getLeagueSettings } from '../../domain/quiz/league';
import { buildLeagueQuestions } from '../../domain/quiz/question-generation';
import type { GameSettings } from '../../domain/settings/types';
import {
  readPlayerSave,
  reportSaveError,
} from '../../lib/storage/player-storage';

interface LeagueChallengeOptions {
  catalog?: PokemonCatalog;
  settings: GameSettings;
  startGame: StartGame;
}

export const useLeagueChallenge = ({
  catalog,
  settings,
  startGame,
}: LeagueChallengeOptions) => {
  const start = useCallback(async () => {
    if (!catalog) return false;
    try {
      const seed = crypto.randomUUID();
      const leagueSettings = getLeagueSettings(settings);
      return await startGame(
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
    } catch (error) {
      reportSaveError(error);
      return false;
    }
  }, [catalog, settings, startGame]);

  return { retry: start, start };
};
