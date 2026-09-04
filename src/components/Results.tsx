import { useEffect, useRef } from 'react';
import { useGameSounds } from '@/audio/sound';
import { getModeLabel } from '@/game/daily';
import {
  formatDuration,
  getCategoryLabel,
  getKnowledgePoints,
  getMasteryBonus,
  getSpeedBonus,
} from '@/game/game';
import { formatScore } from '@/game/format';
import {
  formatTrainerStampTier,
  type TrainerStampChange,
} from '@/game/trainer';
import type { GameMode, GameResult } from '@/game/types';
import { AnimatedScore } from './AnimatedScore';
import { CatchCombo } from './CatchCombo';
import { GameButton } from './GameButton';
import { SettingsButton } from './SettingsButton';
import { ShareResultButton } from './ShareResultButton';
import { TrainerStampMark } from './TrainerStampMark';

interface ResultsProps {
  bestResult: GameResult;
  dailyStreak: number;
  isNewBest: boolean;
  mode: GameMode;
  onNewGame: () => void;
  onOpenTrainerCard: () => void;
  onOpenSettings: () => void;
  onTrainAgain: () => void;
  result: GameResult;
  resultSaved: boolean;
  stampChanges: TrainerStampChange[];
}

export const Results = ({
  bestResult,
  dailyStreak,
  isNewBest,
  mode,
  onNewGame,
  onOpenTrainerCard,
  onOpenSettings,
  onTrainAgain,
  result,
  resultSaved,
  stampChanges,
}: ResultsProps) => {
  const { playPerfect, playResults, playScoreCount, stopCelebration } =
    useGameSounds();
  const heading = useRef<HTMLHeadingElement>(null);
  const primaryStampChange = stampChanges[0];

  useEffect(() => {
    heading.current?.focus();
  }, []);

  useEffect(() => {
    if (result.correctCount === result.questionCount) playPerfect();
    else if (result.score > 0) playResults();

    if (result.score > 0) playScoreCount();
    return stopCelebration;
  }, [
    playPerfect,
    playResults,
    playScoreCount,
    result.correctCount,
    result.questionCount,
    result.score,
    stopCelebration,
  ]);

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
      ) : !resultSaved ? (
        <p className="personal-best personal-best--warning" role="alert">
          This result could not be saved. Keep this tab open or enable browser
          storage.
        </p>
      ) : null}

      <GameButton
        className={`trainer-card-update${primaryStampChange ? ' trainer-card-update--stamp' : ''}`}
        tone="quiet"
        onClick={onOpenTrainerCard}
      >
        {primaryStampChange ? (
          <TrainerStampMark
            id={primaryStampChange.id}
            tier={primaryStampChange.tier}
          />
        ) : (
          <span className="trainer-card-update__mark" aria-hidden="true">
            ID
          </span>
        )}
        <span>
          <strong>
            {stampChanges.length > 1
              ? `${stampChanges.length} League stamps advanced`
              : primaryStampChange
                ? `${primaryStampChange.label} reached ${formatTrainerStampTier(primaryStampChange.tier)}`
                : 'View Trainer Card'}
          </strong>
          <small>
            {primaryStampChange
              ? 'See your new mark and next challenge'
              : 'Profile, records, and League stamps'}
          </small>
        </span>
        <span aria-hidden="true">›</span>
      </GameButton>

      {mode.kind === 'training' ? (
        <div className="results__actions results__actions--training">
          <GameButton onClick={onTrainAgain}>Train again</GameButton>
          <ShareResultButton mode={mode} result={result} tone="quiet" />
          <GameButton tone="quiet" onClick={onNewGame}>
            Back to start
          </GameButton>
        </div>
      ) : (
        <div className="results__actions">
          <ShareResultButton mode={mode} result={result} />
          <GameButton tone="quiet" onClick={onNewGame}>
            Back to start
          </GameButton>
        </div>
      )}
    </section>
  );
};
