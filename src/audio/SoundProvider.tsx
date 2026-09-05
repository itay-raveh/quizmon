import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
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

type UseSound = (typeof import('use-sound'))['default'];

const silentScoreCount: ScoreCountControls = {
  play: () => undefined,
  stop: () => undefined,
};

const silentControls: SoundControls = {
  playCorrect: () => undefined,
  playPerfect: () => undefined,
  playResults: () => undefined,
  playScoreCount: () => undefined,
  playTap: () => undefined,
  playToggleOff: () => undefined,
  playToggleOn: () => undefined,
  playWrong: () => undefined,
  stopCelebration: () => undefined,
};

const ScoreCountSound = ({
  onReady,
  useSound,
}: {
  onReady: (controls: ScoreCountControls) => void;
  useSound: UseSound;
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

const SoundEngine = ({
  onReady,
  prepareScoreCount,
  useSound,
}: {
  onReady: (controls: SoundControls) => void;
  prepareScoreCount: boolean;
  useSound: UseSound;
}) => {
  const [scoreCountControls, setScoreCountControls] =
    useState<ScoreCountControls>(silentScoreCount);
  const sharedOptions = { interrupt: true };
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
    return stopCelebration;
  }, [stopCelebration]);

  const play = useCallback((sound: () => void) => sound(), []);

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

  useEffect(() => {
    onReady(controls);
    return () => onReady(silentControls);
  }, [controls, onReady]);

  return (
    <>
      {prepareScoreCount ? (
        <ScoreCountSound onReady={setScoreCountControls} useSound={useSound} />
      ) : null}
    </>
  );
};

export const SoundProvider = ({
  children,
  enabled,
  prepareScoreCount,
}: SoundProviderProps) => {
  const [controls, setControls] = useState<SoundControls>(silentControls);
  const [useSound, setUseSound] = useState<UseSound | null>(null);

  useEffect(() => {
    if (!enabled || useSound) return;

    let active = true;
    let loading = false;
    const prepare = () => {
      if (loading) return;
      loading = true;
      void import('use-sound')
        .then((module) => {
          if (active) setUseSound(() => module.default);
        })
        .catch(() => {
          loading = false;
        });
    };

    if (prepareScoreCount) {
      prepare();
      return () => {
        active = false;
      };
    }

    const events = ['keydown', 'pointerdown'] as const;
    for (const event of events) document.addEventListener(event, prepare);

    return () => {
      active = false;
      for (const event of events) document.removeEventListener(event, prepare);
    };
  }, [enabled, prepareScoreCount, useSound]);

  return (
    <SoundContext.Provider value={enabled ? controls : silentControls}>
      {children}
      {enabled && useSound ? (
        <SoundEngine
          onReady={setControls}
          prepareScoreCount={prepareScoreCount}
          useSound={useSound}
        />
      ) : null}
    </SoundContext.Provider>
  );
};
