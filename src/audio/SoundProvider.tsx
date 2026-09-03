import { useCallback, useEffect, useMemo, type ReactNode } from 'react';
import useSound from 'use-sound';
import correctSound from '@/assets/sounds/answer-correct.mp3';
import wrongSound from '@/assets/sounds/answer-wrong.mp3';
import perfectSound from '@/assets/sounds/perfect.mp3';
import scoreCountSound from '@/assets/sounds/prize-wheel-spin.mp3';
import resultsSound from '@/assets/sounds/results.mp3';
import tapSound from '@/assets/sounds/tap.mp3';
import toggleOffSound from '@/assets/sounds/toggle-off.mp3';
import toggleOnSound from '@/assets/sounds/toggle-on.mp3';
import { SoundContext, type SoundControls } from './sound';

interface SoundProviderProps {
  children: ReactNode;
  enabled: boolean;
}

export const SoundProvider = ({ children, enabled }: SoundProviderProps) => {
  const sharedOptions = { interrupt: true, soundEnabled: enabled };
  const [playTap] = useSound(tapSound, { ...sharedOptions, volume: 0.16 });
  const [playToggleOff] = useSound(toggleOffSound, {
    ...sharedOptions,
    volume: 0.18,
  });
  const [playToggleOn] = useSound(toggleOnSound, {
    ...sharedOptions,
    volume: 0.18,
  });
  const [playCorrect] = useSound(correctSound, {
    ...sharedOptions,
    volume: 0.28,
  });
  const [playWrong] = useSound(wrongSound, {
    ...sharedOptions,
    volume: 0.24,
  });
  const [playResults, { stop: stopResults }] = useSound(resultsSound, {
    ...sharedOptions,
    volume: 0.32,
  });
  const [playPerfect, { stop: stopPerfect }] = useSound(perfectSound, {
    ...sharedOptions,
    volume: 0.36,
  });
  const [playScoreCount, { stop: stopScoreCount }] = useSound(
    scoreCountSound,
    sharedOptions,
  );

  const stopCelebration = useCallback(() => {
    stopResults();
    stopPerfect();
    stopScoreCount();
  }, [stopPerfect, stopResults, stopScoreCount]);

  useEffect(() => {
    if (!enabled) stopCelebration();
  }, [enabled, stopCelebration]);

  const play = useCallback(
    (sound: () => void) => {
      if (enabled) sound();
    },
    [enabled],
  );

  const controls = useMemo<SoundControls>(
    () => ({
      playCorrect: () => play(playCorrect),
      playPerfect: () => play(playPerfect),
      playResults: () => play(playResults),
      playScoreCount: () => play(playScoreCount),
      playTap: () => play(playTap),
      playToggleOff: () => play(playToggleOff),
      playToggleOn: () => play(playToggleOn),
      playWrong: () => play(playWrong),
      stopCelebration,
    }),
    [
      play,
      playCorrect,
      playPerfect,
      playResults,
      playScoreCount,
      playTap,
      playToggleOff,
      playToggleOn,
      playWrong,
      stopCelebration,
    ],
  );

  return (
    <SoundContext.Provider value={controls}>{children}</SoundContext.Provider>
  );
};
