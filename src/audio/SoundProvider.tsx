import { useCallback, useEffect, useMemo, type ReactNode } from 'react';
import useSound from 'use-sound';
import popDown from '@/assets/sounds/pop-down.mp3';
import popOff from '@/assets/sounds/pop-up-off.mp3';
import popOn from '@/assets/sounds/pop-up-on.mp3';
import scoreSound from '@/assets/sounds/prize-wheel-spin.mp3';
import { SoundContext, type SoundControls } from './sound';

interface SoundProviderProps {
  children: ReactNode;
  enabled: boolean;
}

export const SoundProvider = ({ children, enabled }: SoundProviderProps) => {
  const [playDown] = useSound(popDown, { soundEnabled: enabled, volume: 0.25 });
  const [playOff] = useSound(popOff, { soundEnabled: enabled, volume: 0.25 });
  const [playOn] = useSound(popOn, { soundEnabled: enabled, volume: 0.25 });
  const [playScore, { stop: stopScore }] = useSound(scoreSound, {
    soundEnabled: enabled,
  });

  useEffect(() => {
    if (!enabled) stopScore();
  }, [enabled, stopScore]);

  const play = useCallback(
    (sound: () => void) => {
      if (enabled) sound();
    },
    [enabled],
  );

  const controls = useMemo<SoundControls>(
    () => ({
      playDown: () => play(playDown),
      playOff: () => play(playOff),
      playOn: () => play(playOn),
      playScore: () => play(playScore),
      stopScore,
    }),
    [play, playDown, playOff, playOn, playScore, stopScore],
  );

  return (
    <SoundContext.Provider value={controls}>{children}</SoundContext.Provider>
  );
};
