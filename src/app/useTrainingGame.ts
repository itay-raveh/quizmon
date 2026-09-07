import { useCallback, useRef, useState } from 'react';
import { buildQuestions, getTrainingModifiers } from '@/game/game';
import { createRoundSeed, createSeededRandom } from '@/game/random';
import {
  markGenerationPromptAnswered,
  shouldShowGenerationPrompt,
} from '@/game/settings-storage';
import { generations } from '@/game/types';
import type { Generation, Modifiers, PokemonCatalog } from '@/game/types';
import type { GameSession, StartGame } from './session';

interface TrainingGameOptions {
  catalog?: PokemonCatalog;
  modifiers: Modifiers;
  session: GameSession;
  setModifiers: (modifiers: Modifiers) => void;
  startGame: StartGame;
}

export const useTrainingGame = ({
  catalog,
  modifiers,
  session,
  setModifiers,
  startGame,
}: TrainingGameOptions) => {
  const [generationPromptOpen, setGenerationPromptOpen] = useState(false);
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
    (nextModifiers: Modifiers) => {
      if (!catalog) return;
      const seed = createRoundSeed();
      const gameModifiers = getTrainingModifiers(nextModifiers);
      startGame(
        buildQuestions(catalog, gameModifiers, createSeededRandom(seed)),
        gameModifiers,
        { kind: 'training' },
        seed,
      );
    },
    [catalog, startGame],
  );

  const startWithGenerations = useCallback(
    (selectedGenerations: Generation[]) => {
      if (!catalog) return;

      const nextModifiers = {
        ...modifiers,
        generations: selectedGenerations,
      };
      setModifiers(nextModifiers);
      markGenerationPromptAnswered();
      generationPromptPending.current = false;
      setGenerationPromptOpen(false);
      startRound(nextModifiers);
    },
    [catalog, modifiers, setModifiers, startRound],
  );

  const start = useCallback(() => {
    if (!catalog) return;
    if (isGenerationPromptPending()) {
      setGenerationPromptOpen(true);
      return;
    }

    startRound(modifiers);
  }, [catalog, isGenerationPromptPending, modifiers, startRound]);

  const trainAgain = useCallback(() => {
    if (
      !catalog ||
      session.phase !== 'results' ||
      session.mode.kind !== 'training'
    ) {
      return;
    }

    startRound(session.modifiers);
  }, [catalog, session, startRound]);

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
