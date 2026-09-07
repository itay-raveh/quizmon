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
import { silentSoundControls, SoundContext, type SoundControls } from './sound';

interface SoundProviderProps {
  children: ReactNode;
  prepareScoreCount: boolean;
  volume: number;
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

const ScoreCountSound = ({
  onReady,
  useSound,
  volume,
}: {
  onReady: (controls: ScoreCountControls) => void;
  useSound: UseSound;
  volume: number;
}) => {
  const [play, { stop }] = useSound(scoreCountSound, {
    interrupt: true,
    volume: 0.24 * volume,
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
  volume,
}: {
  onReady: (controls: SoundControls) => void;
  prepareScoreCount: boolean;
  useSound: UseSound;
  volume: number;
}) => {
  const [scoreCountControls, setScoreCountControls] =
    useState<ScoreCountControls>(silentScoreCount);
  const sharedOptions = { interrupt: true };
  const [playTap] = useSound(tapSound, {
    ...sharedOptions,
    volume: 0.16 * volume,
  });
  const [playToggleOff] = useSound(toggleOffSound, {
    ...sharedOptions,
    volume: 0.18 * volume,
  });
  const [playToggleOn] = useSound(toggleOnSound, {
    ...sharedOptions,
    volume: 0.18 * volume,
  });
  const [playCorrect] = useSound(correctSound, {
    ...sharedOptions,
    volume: 0.28 * volume,
  });
  const [playWrong] = useSound(wrongSound, {
    ...sharedOptions,
    volume: 0.24 * volume,
  });
  const [playResults, { stop: stopResults }] = useSound(resultsSound, {
    ...sharedOptions,
    volume: 0.32 * volume,
  });
  const [playPerfect, { stop: stopPerfect }] = useSound(perfectSound, {
    ...sharedOptions,
    volume: 0.36 * volume,
  });

  const stopCelebration = useCallback(() => {
    stopResults();
    stopPerfect();
    scoreCountControls.stop();
  }, [scoreCountControls, stopPerfect, stopResults]);

  useEffect(() => {
    return stopCelebration;
  }, [stopCelebration]);

  const controls = useMemo<SoundControls>(
    () => ({
      playCorrect: () => playCorrect(),
      playPerfect: () => playPerfect(),
      playResults: () => playResults(),
      playScoreCount: () => scoreCountControls.play(),
      playTap: () => playTap(),
      playToggleOff: () => playToggleOff(),
      playToggleOn: () => playToggleOn(),
      playWrong: () => playWrong(),
      stopCelebration,
    }),
    [
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
    return () => onReady(silentSoundControls);
  }, [controls, onReady]);

  return (
    <>
      {prepareScoreCount ? (
        <ScoreCountSound
          onReady={setScoreCountControls}
          useSound={useSound}
          volume={volume}
        />
      ) : null}
    </>
  );
};

export const SoundProvider = ({
  children,
  prepareScoreCount,
  volume,
}: SoundProviderProps) => {
  const [controls, setControls] = useState<SoundControls>(silentSoundControls);
  const [useSound, setUseSound] = useState<UseSound | null>(null);

  useEffect(() => {
    if (volume <= 0 || useSound) return;

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
  }, [prepareScoreCount, useSound, volume]);

  return (
    <SoundContext.Provider value={volume > 0 ? controls : silentSoundControls}>
      {children}
      {volume > 0 && useSound ? (
        <SoundEngine
          onReady={setControls}
          prepareScoreCount={prepareScoreCount}
          useSound={useSound}
          volume={volume}
        />
      ) : null}
    </SoundContext.Provider>
  );
};
