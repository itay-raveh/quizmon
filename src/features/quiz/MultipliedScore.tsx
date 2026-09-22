import { useReducedMotion } from '@/app/providers/motion-context';
import { formatScore, formatScoreMultiplier } from '@/domain/pokemon/format';
import { getQuestionTypesMultiplier } from '@/domain/quiz/score-multipliers';
import type { ScoreMultipliers } from '@/domain/quiz/types';
import { useGameSounds } from '@/lib/audio/sound-context';
import { useEffect, useState, type CSSProperties } from 'react';

interface MultipliedScoreProps {
  baseScore: number;
  multipliers: ScoreMultipliers;
  score: number;
}

export const MultipliedScore = ({
  baseScore,
  multipliers,
  score,
}: MultipliedScoreProps) => {
  const reducedMotion = useReducedMotion();
  const { playScoreCount } = useGameSounds();
  const [elapsed, setElapsed] = useState(0);
  const duration = multipliers.formGroupCount === undefined ? 2400 : 2900;

  useEffect(() => {
    if (reducedMotion || score === 0) return;
    const playback = !document.hidden ? playScoreCount() : undefined;
    const startedAt = performance.now();
    let frame = 0;
    const finish = () => {
      window.cancelAnimationFrame(frame);
      playback?.stop();
      setElapsed(duration);
    };
    const update = (now: number) => {
      const next = now - startedAt;
      if (next >= duration) finish();
      else {
        setElapsed(next);
        frame = window.requestAnimationFrame(update);
      }
    };
    const onVisibility = () => {
      if (document.hidden) finish();
    };
    if (document.hidden) finish();
    else frame = window.requestAnimationFrame(update);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.cancelAnimationFrame(frame);
      playback?.stop();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [duration, playScoreCount, reducedMotion, score]);

  const time = reducedMotion || score === 0 ? duration : elapsed;
  const stages = [
    { label: 'Difficulty', factor: multipliers.difficulty, start: 900 },
    { label: 'Generations', factor: multipliers.generations, start: 1400 },
    ...(multipliers.formGroupCount === undefined
      ? []
      : [
          {
            label: 'Forms',
            factor: 1.25 ** multipliers.formGroupCount,
            start: 1900,
          },
        ]),
    {
      label: 'Question types',
      factor: getQuestionTypesMultiplier(
        multipliers.questionTypes,
        multipliers.questionMix,
      ),
      start: duration - 500,
    },
  ];
  const targets = [
    baseScore,
    baseScore * multipliers.difficulty,
    baseScore * multipliers.difficulty * multipliers.generations,
    ...(multipliers.formGroupCount === undefined
      ? []
      : [
          baseScore *
            multipliers.difficulty *
            multipliers.generations *
            1.25 ** multipliers.formGroupCount,
        ]),
    score,
  ];
  const index =
    time < 900
      ? 0
      : Math.min(stages.length, 1 + Math.floor((time - 900) / 500));
  const start = index === 0 ? 0 : 900 + (index - 1) * 500;
  const progress = Math.min(1, (time - start) / (index === 0 ? 900 : 500));
  const from = index === 0 ? 0 : targets[index - 1]!;
  const displayed =
    time >= duration
      ? score
      : Math.round(from + (targets[index]! - from) * (1 - (1 - progress) ** 3));

  return (
    <>
      <div
        className="score score--multiplied"
        aria-label={`Score ${formatScore(score)}`}
        style={
          {
            '--score-digits': formatScore(Math.max(score, ...targets)).length,
          } as CSSProperties
        }
      >
        <span>Score</span>
        <strong aria-hidden="true">{formatScore(displayed)}</strong>
      </div>
      <ol className="score-factors" aria-label="Score multipliers">
        {stages.map(({ label, factor, start }) => (
          <li
            key={label}
            className={
              time >= start && time < start + 500
                ? 'score-factors__active'
                : undefined
            }
          >
            <span>{label}</span>
            <strong>{formatScoreMultiplier(factor)}</strong>
          </li>
        ))}
      </ol>
    </>
  );
};
