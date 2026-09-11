import type { GameSession, StartGame } from '@/app/game-session';
import {
  generations,
  type Generation,
  type PokemonCatalog,
} from '@/domain/pokemon/types';
import { buildQuestions } from '@/domain/quiz/question-generation';
import {
  getTrainingSettings,
  TRAINING_QUESTION_COUNT,
} from '@/domain/settings/game-settings';
import { type GameSettings } from '@/domain/settings/types';
import { useUpdateState } from '@/features/installation/update-session';
import { createRoundSeed, createSeededRandom } from '@/lib/random';
import { readPlayerData } from '@/lib/storage/player-storage';
import { useCallback, useRef } from 'react';
import {
  markGenerationPromptAnswered,
  shouldShowGenerationPrompt,
} from '../../lib/storage/generation-prompt-storage';

interface TrainingGameOptions {
  catalog?: PokemonCatalog;
  settings: GameSettings;
  session: GameSession;
  setSettings: (settings: GameSettings) => void;
  startGame: StartGame;
}

export const useTrainingGame = ({
  catalog,
  settings,
  session,
  setSettings,
  startGame,
}: TrainingGameOptions) => {
  const [generationPromptOpen, setGenerationPromptOpen] = useUpdateState(
    'generation-prompt',
    false,
  );
  const generationPromptPending = useRef<boolean | null>(null);

  const isGenerationPromptPending = useCallback(() => {
    generationPromptPending.current ??= shouldShowGenerationPrompt();
    return generationPromptPending.current;
  }, []);

  const markGenerationKnown = useCallback(() => {
    if (!isGenerationPromptPending()) return;
    markGenerationPromptAnswered();
    generationPromptPending.current = false;
  }, [isGenerationPromptPending]);

  const startRound = useCallback(
    (nextSettings: GameSettings) => {
      if (!catalog) return;
      const seed = createRoundSeed();
      const gameSettings = getTrainingSettings(nextSettings);
      startGame(
        buildQuestions(
          catalog,
          gameSettings,
          createSeededRandom(seed),
          TRAINING_QUESTION_COUNT,
          readPlayerData().questionHistory,
        ),
        gameSettings,
        { kind: 'training' },
        seed,
      );
    },
    [catalog, startGame],
  );

  const startWithGenerations = useCallback(
    (selectedGenerations: Generation[]) => {
      if (!catalog) return;

      const nextSettings = {
        ...settings,
        generations: selectedGenerations,
      };
      setSettings(nextSettings);
      markGenerationPromptAnswered();
      generationPromptPending.current = false;
      setGenerationPromptOpen(false);
      startRound(nextSettings);
    },
    [catalog, settings, setSettings, startRound, setGenerationPromptOpen],
  );

  const start = useCallback(() => {
    if (!catalog) return;
    if (isGenerationPromptPending()) {
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

  const trainAgain = useCallback(() => {
    if (session.phase !== 'results' || session.mode.kind !== 'training') return;

    startRound(session.settings);
  }, [session, startRound]);

  return {
    chooseAllGenerations: () => startWithGenerations([...generations]),
    chooseGenOne: () => startWithGenerations(['I']),
    closeGenerationPrompt: () => setGenerationPromptOpen(false),
    generationPromptOpen,
    markGenerationKnown,
    start,
    trainAgain,
  };
};
