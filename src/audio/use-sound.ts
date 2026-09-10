import { useCallback, useEffect, useRef } from 'react';
import { Howl } from 'howler';
import type { SoundPlayback } from './sound';

export default function useSound(
  src: string,
  volume: number,
  trackProgress = false,
) {
  const sound = useRef<Howl | null>(null);
  const currentVolume = useRef(volume);

  useEffect(() => {
    currentVolume.current = volume;
    sound.current?.volume(volume);
  }, [volume]);

  useEffect(() => {
    const instance = new Howl({ src: [src], volume: currentVolume.current });
    sound.current = instance;
    return () => {
      instance.unload();
      if (sound.current === instance) sound.current = null;
    };
  }, [src]);

  const play = useCallback((): SoundPlayback | undefined => {
    const instance = sound.current;
    if (!instance) return;
    instance.stop();
    const id = instance.play();
    if (!trackProgress) return;
    let ended = false;
    let failed = false;
    const finish = () => {
      ended = true;
    };
    const fail = () => {
      failed = true;
    };
    instance.once('end', finish, id);
    instance.once('playerror', fail, id);
    instance.once('loaderror', fail);
    return {
      progress: (endEarlyMilliseconds = 0) => {
        if (failed || instance.state() === 'unloaded') return undefined;
        if (ended) return 1;
        const duration = instance.duration(id);
        if (instance.state() !== 'loaded') return 0;
        const position = instance.seek(id);
        if (!duration || typeof position !== 'number') return 0;
        const animationDuration = Math.max(
          0,
          duration - endEarlyMilliseconds / 1000,
        );
        return animationDuration > 0
          ? Math.min(position / animationDuration, 1)
          : 1;
      },
      stop: () => {
        instance.off('end', finish, id);
        instance.off('playerror', fail, id);
        instance.off('loaderror', fail);
        instance.stop(id);
      },
    };
  }, [trackProgress]);

  const stop = useCallback(() => {
    sound.current?.stop();
  }, []);

  return [play, { stop }] as const;
}

export { useRewardSounds } from './use-reward-sounds';
