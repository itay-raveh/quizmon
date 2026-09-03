import { useCallback, useEffect, useRef } from 'react';
import { useGameSounds } from '@/audio/sound';
import { getModeLabel } from '@/game/daily';
import {
  formatDuration,
  getCategoryLabel,
  getKnowledgePoints,
  getMasteryBonus,
  getSpeedBonus,
} from '@/game/game';
import type { GameMode, GameResult } from '@/game/types';
import { AnimatedScore } from './AnimatedScore';
import { CatchCombo } from './CatchCombo';
import { GameButton } from './GameButton';
import { SettingsButton } from './SettingsButton';
import { ShareResultButton } from './ShareResultButton';

interface ResultsProps {
  bestResult: GameResult;
  dailyStreak: number;
  isNewBest: boolean;
  mode: GameMode;
  onNewGame: () => void;
  onOpenSettings: () => void;
  result: GameResult;
  resultSaved: boolean;
}

export const Results = ({
  bestResult,
  dailyStreak,
  isNewBest,
  mode,
  onNewGame,
  onOpenSettings,
  result,
  resultSaved,
}: ResultsProps) => {
  const { playScore, stopScore } = useGameSounds();
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    heading.current?.focus();
  }, []);

  useEffect(() => {
    if (result.score > 1) playScore();
    return stopScore;
  }, [playScore, result.score, stopScore]);

  const formatScore = useCallback(
    (value: number) =>
      Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(value),
    [],
  );

  return (
    <section className="results" aria-labelledby="results-title">
      <div className="results__header">
        {mode.kind === 'daily' && dailyStreak > 0 ? (
          <CatchCombo celebrate count={dailyStreak} />
        ) : (
          <span aria-hidden="true" />
        )}
        <h1 id="results-title" ref={heading} tabIndex={-1}>
          {mode.kind === 'daily' ? 'Daily complete' : 'Training complete'}
        </h1>
        <SettingsButton onClick={onOpenSettings} />
      </div>
      <p className="game-mode">{getModeLabel(mode)}</p>

      <dl className="results-list">
        {result.questionCount > 10 ? (
          <div>
            <dt>Correct</dt>
            <dd>
              {result.correctCount} / {result.questionCount}
            </dd>
          </div>
        ) : null}
        <div>
          <dt>Time</dt>
          <dd>{formatDuration(result.elapsedSeconds)}</dd>
        </div>
      </dl>

      {result.questionCount <= 10 ? (
        <ol className="answer-trail" aria-label="Question results">
          {result.answers.map((answer, index) => (
            <li
              className={answer.correct ? 'answer-trail--correct' : ''}
              key={`${answer.category}-${index}`}
              title={`${getCategoryLabel(answer.category)}: ${answer.correct ? 'correct' : 'incorrect'}`}
            >
              <span aria-hidden="true">{answer.correct ? '✓' : '×'}</span>
              <span className="visually-hidden">
                {getCategoryLabel(answer.category)}:{' '}
                {answer.correct ? 'correct' : 'incorrect'}
              </span>
            </li>
          ))}
        </ol>
      ) : null}

      <div className="score" aria-label={`Score ${formatScore(result.score)}`}>
        <span>Score</span>
        <strong>
          <AnimatedScore format={formatScore} value={result.score} />
        </strong>
        <small className="score__breakdown">
          {formatScore(getKnowledgePoints(result.answers))} knowledge +{' '}
          {formatScore(getSpeedBonus(result.answers))} speed +{' '}
          {formatScore(getMasteryBonus(result.answers))} mastery
        </small>
      </div>

      {mode.kind === 'training' ? (
        <p className="personal-best">
          {isNewBest ? <strong>New best!</strong> : 'Best'}{' '}
          {formatScore(bestResult.score)} points
        </p>
      ) : (
        <p
          className={`personal-best ${resultSaved ? '' : 'personal-best--warning'}`.trim()}
          role={resultSaved ? undefined : 'alert'}
        >
          {resultSaved
            ? 'Saved on this device.'
            : 'This result could not be saved. Keep this tab open or enable browser storage.'}
        </p>
      )}

      <div className="results__actions">
        <ShareResultButton mode={mode} result={result} />
        <GameButton tone="quiet" onClick={onNewGame}>
          {mode.kind === 'daily' ? 'Back to start' : 'Train again'}
        </GameButton>
      </div>
    </section>
  );
};
