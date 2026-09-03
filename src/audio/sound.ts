import { createContext, useContext } from 'react';

export interface SoundControls {
  playCorrect: () => void;
  playDown: () => void;
  playOff: () => void;
  playOn: () => void;
  playScore: () => void;
  playWrong: () => void;
  stopScore: () => void;
}

const noop = () => undefined;

export const SoundContext = createContext<SoundControls>({
  playCorrect: noop,
  playDown: noop,
  playOff: noop,
  playOn: noop,
  playScore: noop,
  playWrong: noop,
  stopScore: noop,
});

export const useGameSounds = () => useContext(SoundContext);
