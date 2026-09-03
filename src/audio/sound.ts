import { createContext, useContext } from 'react';

export interface SoundControls {
  playCorrect: () => void;
  playPerfect: () => void;
  playResults: () => void;
  playScoreCount: () => void;
  playTap: () => void;
  playToggleOff: () => void;
  playToggleOn: () => void;
  playWrong: () => void;
  stopCelebration: () => void;
}

const noop = () => undefined;

export const SoundContext = createContext<SoundControls>({
  playCorrect: noop,
  playPerfect: noop,
  playResults: noop,
  playScoreCount: noop,
  playTap: noop,
  playToggleOff: noop,
  playToggleOn: noop,
  playWrong: noop,
  stopCelebration: noop,
});

export const useGameSounds = () => useContext(SoundContext);
