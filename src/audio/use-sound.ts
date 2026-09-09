import { useCallback, useEffect, useRef } from 'react';
import { Howl } from 'howler';

export default function useSound(src: string, volume: number) {
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

  const play = useCallback(() => {
    const instance = sound.current;
    if (!instance) return;
    instance.stop();
    instance.play();
  }, []);

  const stop = useCallback(() => {
    sound.current?.stop();
  }, []);

  return [play, { stop }] as const;
}

export { useRewardSounds } from './use-reward-sounds';
