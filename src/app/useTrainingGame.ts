import { useCallback, useRef, useState } from 'react';
import { buildQuestions } from '@/game/game';
import { createRoundSeed, createSeededRandom } from '@/game/random';
import {
  markGenerationPromptAnswered,
  shouldShowGenerationPrompt,
} from '@/game/settings-storage';
import { generations } from '@/game/types';
import type {
  GameMode,
  Generation,
  Modifiers,
  PokemonCatalog,
  QuestionData,
} from '@/game/types';
import type { GameSession } from './session';

interface TrainingGameOptions {
  catalog?: PokemonCatalog;
  modifiers: Modifiers;
  session: GameSession;
  setModifiers: (modifiers: Modifiers) => void;
  startGame: (
    questions: QuestionData[],
    modifiers: Modifiers,
    mode: GameMode,
    seed: string,
  ) => void;
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
      const seed = createRoundSeed();
      startGame(
        buildQuestions(catalog, nextModifiers, createSeededRandom(seed)),
        nextModifiers,
        { kind: 'training' },
        seed,
      );
    },
    [catalog, modifiers, setModifiers, startGame],
  );

  const start = useCallback(() => {
    if (!catalog) return;
    if (isGenerationPromptPending()) {
      setGenerationPromptOpen(true);
      return;
    }

    const seed = createRoundSeed();
    startGame(
      buildQuestions(catalog, modifiers, createSeededRandom(seed)),
      modifiers,
      { kind: 'training' },
      seed,
    );
  }, [catalog, isGenerationPromptPending, modifiers, startGame]);

  const trainAgain = useCallback(() => {
    if (
      !catalog ||
      session.phase !== 'results' ||
      session.mode.kind !== 'training'
    ) {
      return;
    }

    const seed = createRoundSeed();
    startGame(
      buildQuestions(catalog, session.modifiers, createSeededRandom(seed)),
      session.modifiers,
      { kind: 'training' },
      seed,
    );
  }, [catalog, session, startGame]);

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
