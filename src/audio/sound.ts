import { createContext, useCallback, useContext } from 'react';

export type InteractionSound = 'none' | 'tap' | 'toggle-off' | 'toggle-on';

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

export const useInteractionSound = () => {
  const { playTap, playToggleOff, playToggleOn } = useGameSounds();

  return useCallback(
    (sound: InteractionSound) => {
      if (sound === 'tap') playTap();
      else if (sound === 'toggle-off') playToggleOff();
      else if (sound === 'toggle-on') playToggleOn();
    },
    [playTap, playToggleOff, playToggleOn],
  );
};
