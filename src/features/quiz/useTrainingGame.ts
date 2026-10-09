import type { StartGame } from '@/app/game-session';
import type { PokemonCatalog } from '../../domain/pokemon/types';
import {
  buildQuestions,
  resolveTrainingSettings,
} from '@/domain/quiz/question-generation';
import { TRAINING_QUESTION_COUNT } from '@/domain/settings/game-settings';
import { type GameSettings } from '@/domain/settings/types';
import { createSeededRandom } from '@/lib/random';
import { readPlayerData } from '@/lib/storage/player-storage';
import { readPreviousTrainingQuestionTypes } from '@/lib/storage/round-storage';
import { useCallback, useState } from 'react';

interface TrainingGameOptions {
  catalog?: PokemonCatalog;
  settings: GameSettings;
  startGame: StartGame;
}

export const useTrainingGame = ({
  catalog,
  settings,
  startGame,
}: TrainingGameOptions) => {
  const [error, setError] = useState('');
  const startRound = useCallback(
    async (nextSettings: GameSettings) => {
      if (!catalog) return;
      const seed = crypto.randomUUID();
      const gameSettings = resolveTrainingSettings(catalog, nextSettings);
      const previousRoundTypes = await readPreviousTrainingQuestionTypes();
      const questions = buildQuestions(
        catalog,
        gameSettings,
        createSeededRandom(seed),
        TRAINING_QUESTION_COUNT,
        readPlayerData().questionHistory,
        previousRoundTypes,
      );
      if (questions.length !== TRAINING_QUESTION_COUNT) {
        setError(
          'This configuration cannot supply a complete round. Change your generations, forms, or question selection in Settings.',
        );
        return;
      }
      setError('');
      await startGame(questions, gameSettings, { kind: 'training' }, seed);
    },
    [catalog, startGame],
  );

  const start = useCallback(
    () => void startRound(settings),
    [settings, startRound],
  );
  return {
    error,
    start,
    trainAgain: start,
  };
};
