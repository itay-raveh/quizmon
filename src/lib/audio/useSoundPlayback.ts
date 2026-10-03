export { useRewardSounds } from './useRewardSounds';
import { Howl } from 'howler';
import { useCallback, useEffect, useRef } from 'react';
import type { SoundPlayback } from './sound-context';

export default function useSound(
  src: string,
  volume: number,
  returnPlayback = false,
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
    if (!returnPlayback) return;
    return {
      stop: () => {
        instance.stop(id);
      },
    };
  }, [returnPlayback]);

  const stop = useCallback(() => {
    sound.current?.stop();
  }, []);

  return [play, { stop }] as const;
}
