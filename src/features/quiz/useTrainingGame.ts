import type { StartGame } from '@/app/game-session';
import {
  generations,
  type Generation,
  type PokemonCatalog,
} from '../../domain/pokemon/types';
import {
  buildQuestions,
  resolveTrainingSettings,
} from '@/domain/quiz/question-generation';
import { TRAINING_QUESTION_COUNT } from '@/domain/settings/game-settings';
import { type GameSettings } from '@/domain/settings/types';
import { useUpdateState } from '@/features/installation/update-session';
import { createSeededRandom } from '@/lib/random';
import { readPlayerData } from '@/lib/storage/player-storage';
import { useCallback, useRef, useState } from 'react';
import {
  markGenerationPromptAnswered,
  shouldShowGenerationPrompt,
} from '../../lib/storage/generation-prompt-storage';

interface TrainingGameOptions {
  catalog?: PokemonCatalog;
  settings: GameSettings;
  setSettings: (settings: GameSettings) => Promise<boolean>;
  startGame: StartGame;
}

export const useTrainingGame = ({
  catalog,
  settings,
  setSettings,
  startGame,
}: TrainingGameOptions) => {
  const [error, setError] = useState('');
  const [generationPromptOpen, setGenerationPromptOpen] = useUpdateState(
    'generation-prompt',
    false,
  );
  const generationPromptPending = useRef<boolean | null>(null);
  const generationChoicePending = useRef(false);

  const isGenerationPromptPending = useCallback(() => {
    generationPromptPending.current ??= shouldShowGenerationPrompt();
    return generationPromptPending.current;
  }, []);

  const markGenerationKnown = useCallback(async () => {
    if (!isGenerationPromptPending()) return true;
    if (!(await markGenerationPromptAnswered())) return false;
    generationPromptPending.current = false;
    return true;
  }, [isGenerationPromptPending]);

  const startRound = useCallback(
    (nextSettings: GameSettings) => {
      if (!catalog) return;
      const seed = crypto.randomUUID();
      const gameSettings = resolveTrainingSettings(catalog, nextSettings);
      const questions = buildQuestions(
        catalog,
        gameSettings,
        createSeededRandom(seed),
        TRAINING_QUESTION_COUNT,
        readPlayerData().questionHistory,
      );
      if (questions.length !== TRAINING_QUESTION_COUNT) {
        setError(
          'This configuration cannot supply a complete round. Change your generations, forms, or question selection in Settings.',
        );
        return;
      }
      setError('');
      void startGame(questions, gameSettings, { kind: 'training' }, seed);
    },
    [catalog, startGame],
  );

  const startWithGenerations = useCallback(
    async (selectedGenerations: Generation[]) => {
      if (!catalog || generationChoicePending.current) return;
      generationChoicePending.current = true;

      try {
        const nextSettings = {
          ...settings,
          generations: selectedGenerations,
        };
        if (!(await setSettings(nextSettings))) return;
        if (!(await markGenerationKnown())) return;
        setGenerationPromptOpen(false);
        startRound(nextSettings);
      } finally {
        generationChoicePending.current = false;
      }
    },
    [
      catalog,
      settings,
      setSettings,
      markGenerationKnown,
      startRound,
      setGenerationPromptOpen,
    ],
  );

  const start = useCallback(() => {
    if (!catalog) return;
    if (!settings.difficulty && isGenerationPromptPending()) {
      setGenerationPromptOpen(true);
      return;
    }

    startRound(settings);
  }, [
    catalog,
    isGenerationPromptPending,
    settings,
    startRound,
    setGenerationPromptOpen,
  ]);

  return {
    error,
    chooseAllGenerations: () => startWithGenerations([...generations]),
    chooseGenOne: () => startWithGenerations(['I']),
    closeGenerationPrompt: () => {
      if (!generationChoicePending.current) setGenerationPromptOpen(false);
    },
    generationPromptOpen,
    markGenerationKnown,
    start,
    trainAgain: () => startRound(settings),
  };
};
