import { useCallback, useEffect, useRef } from 'react';
import { Howl } from 'howler';

interface SoundOptions {
  interrupt?: boolean;
  volume?: number;
}

export default function useSound(
  src: string,
  { interrupt = false, volume = 1 }: SoundOptions = {},
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

  const play = useCallback(() => {
    const instance = sound.current;
    if (!instance) return;
    if (interrupt) instance.stop();
    instance.play();
  }, [interrupt]);

  const stop = useCallback(() => {
    sound.current?.stop();
  }, []);

  return [play, { stop }] as const;
}
