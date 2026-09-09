import {
  createContext,
  useCallback,
  useContext,
  type ChangeEventHandler,
} from 'react';

export type InteractionSound = 'none' | 'tap' | 'toggle-off' | 'toggle-on';

export type RewardSound = 'gain' | 'gold' | 'complete';

export interface SoundControls {
  playReward: (index: number, kind: RewardSound) => void;
  stopRewards: () => void;
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

export const silentSoundControls: SoundControls = {
  playReward: noop,
  stopRewards: noop,
  playCorrect: noop,
  playPerfect: noop,
  playResults: noop,
  playScoreCount: noop,
  playTap: noop,
  playToggleOff: noop,
  playToggleOn: noop,
  playWrong: noop,
  stopCelebration: noop,
};

export const SoundContext = createContext(silentSoundControls);

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

export const useToggleSound = (
  onChange?: ChangeEventHandler<HTMLInputElement>,
): ChangeEventHandler<HTMLInputElement> => {
  const playInteractionSound = useInteractionSound();
  return (event) => {
    playInteractionSound(event.target.checked ? 'toggle-on' : 'toggle-off');
    onChange?.(event);
  };
};
