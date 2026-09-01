import { createContext, useContext } from 'react';

export interface SoundControls {
  playDown: () => void;
  playOff: () => void;
  playOn: () => void;
  playScore: () => void;
  stopScore: () => void;
}

const noop = () => undefined;

export const SoundContext = createContext<SoundControls>({
  playDown: noop,
  playOff: noop,
  playOn: noop,
  playScore: noop,
  stopScore: noop,
});

export const useGameSounds = () => useContext(SoundContext);
