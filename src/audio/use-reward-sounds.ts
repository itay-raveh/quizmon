import { useCallback, useEffect, useRef } from 'react';
import { Howler } from 'howler';
import type { RewardSound } from './sound';

const notes = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.51];

export const useRewardSounds = (volume: number) => {
  const voices = useRef(new Set<OscillatorNode>());
  const stop = useCallback(() => {
    for (const voice of voices.current) voice.stop();
    voices.current.clear();
  }, []);
  useEffect(() => stop, [stop]);

  const play = useCallback(
    (index: number, kind: RewardSound) => {
      const audio = Howler.ctx;
      if (!audio || audio.state !== 'running' || volume <= 0) return;
      const tone = (
        frequency: number,
        delay: number,
        length: number,
        level: number,
        type: OscillatorType,
      ) => {
        const oscillator = audio.createOscillator();
        const gain = audio.createGain();
        const time = audio.currentTime + delay;
        oscillator.type = type;
        oscillator.frequency.setValueAtTime(frequency, time);
        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(level * volume, time + 0.004);
        gain.gain.exponentialRampToValueAtTime(0.0001, time + length);
        oscillator.connect(gain);
        gain.connect(Howler.masterGain);
        oscillator.onended = () => {
          oscillator.disconnect();
          gain.disconnect();
          voices.current.delete(oscillator);
        };
        oscillator.start(time);
        voices.current.add(oscillator);
        oscillator.stop(time + length + 0.02);
      };
      try {
        if (kind === 'gain') {
          const note = notes[Math.min(index, notes.length - 1)]!;
          tone(note, 0, 0.12, 0.035, 'triangle');
          tone(note / 2, 0, 0.055, 0.02, 'sine');
        } else {
          const chord =
            kind === 'gold'
              ? [523.25, 659.25, 783.99, 1046.5]
              : [523.25, 659.25, 783.99];
          chord.forEach((note, position) =>
            tone(
              note,
              kind === 'gold' ? position * 0.025 : 0,
              kind === 'gold' ? 0.48 : 0.26,
              kind === 'gold' ? 0.024 : 0.018,
              'sine',
            ),
          );
        }
      } catch {
        stop();
      }
    },
    [stop, volume],
  );
  return { play, stop };
};
