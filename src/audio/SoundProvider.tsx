import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
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
  prepareScoreCount: boolean;
}

interface ScoreCountControls {
  play: () => void;
  stop: () => void;
}

const silentScoreCount: ScoreCountControls = {
  play: () => undefined,
  stop: () => undefined,
};

const ScoreCountSound = ({
  onReady,
}: {
  onReady: (controls: ScoreCountControls) => void;
}) => {
  const [play, { stop }] = useSound(scoreCountSound, {
    interrupt: true,
  });

  useEffect(() => {
    onReady({ play, stop });
    return () => {
      stop();
      onReady(silentScoreCount);
    };
  }, [onReady, play, stop]);

  return null;
};

export const SoundProvider = ({
  children,
  enabled,
  prepareScoreCount,
}: SoundProviderProps) => {
  const [scoreCountControls, setScoreCountControls] =
    useState<ScoreCountControls>(silentScoreCount);
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

  const stopCelebration = useCallback(() => {
    stopResults();
    stopPerfect();
    scoreCountControls.stop();
  }, [scoreCountControls, stopPerfect, stopResults]);

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
      playScoreCount: () => play(scoreCountControls.play),
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
      scoreCountControls,
      playTap,
      playToggleOff,
      playToggleOn,
      playWrong,
      stopCelebration,
    ],
  );

  return (
    <SoundContext.Provider value={controls}>
      {children}
      {enabled && prepareScoreCount ? (
        <ScoreCountSound onReady={setScoreCountControls} />
      ) : null}
    </SoundContext.Provider>
  );
};
