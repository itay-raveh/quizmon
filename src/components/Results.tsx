import { useEffect, useRef } from 'react';
import { useGameSounds } from '@/audio/sound';
import { formatDailyDate } from '@/game/daily';
import {
  formatDuration,
  formatDurationMilliseconds,
  getCategoryLabel,
  getKnowledgePoints,
  getMasteryBonus,
  getSpeedBonus,
} from '@/game/game';
import { getLeagueStage, isLeagueVictory } from '@/game/league';
import { formatScore } from '@/game/format';
import { getHighScoreKey } from '@/game/storage';
import type { TrainerProgressChange, TrainerView } from '@/game/trainer';
import type { GameMode, GameResult, Modifiers } from '@/game/types';
import { AnimatedScore } from './AnimatedScore';
import { CatchCombo } from './CatchCombo';
import { DailyReminderPrompt } from './DailyReminderPrompt';
import { GameButton } from './GameButton';
import { CheckIcon, XIcon } from './icons';
import { SettingsButton } from './SettingsButton';
import { ShareResultButton } from './ShareResultButton';
import { TrainerProgressSummary } from './TrainerProgressSummary';

interface ResultsProps {
  bestResult: GameResult;
  dailyStreak: number;
  isNewBest: boolean;
  mode: GameMode;
  modifiers: Modifiers;
  onNewGame: () => void;
  onOpenTrainerCard: (view: TrainerView) => void;
  onOpenSettings: () => void;
  onTrainAgain: () => void;
  onRetryLeague: () => void;
  result: GameResult;
  resultSaved: boolean;
  progressChanges: TrainerProgressChange[];
}

export const Results = ({
  bestResult,
  dailyStreak,
  isNewBest,
  mode,
  modifiers,
  onNewGame,
  onOpenTrainerCard,
  onOpenSettings,
  onTrainAgain,
  onRetryLeague,
  result,
  resultSaved,
  progressChanges,
}: ResultsProps) => {
  const { playPerfect, playResults, playScoreCount, stopCelebration } =
    useGameSounds();
  const heading = useRef<HTMLHeadingElement>(null);
  const leagueVictory = mode.kind === 'league' && isLeagueVictory(result);
  const highScoreKey = getHighScoreKey(mode, modifiers);
  const highScoreLabel = highScoreKey
    ? { custom: 'Custom', daily: 'Daily', league: 'League' }[highScoreKey]
    : null;
  const resultTitle =
    mode.kind === 'daily'
      ? 'Daily complete'
      : mode.kind === 'league'
        ? leagueVictory
          ? 'League Champion'
          : 'League challenge ended'
        : 'Training complete';

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
        <GameButton
          aria-label="Back to start"
          className="results__close"
          onClick={onNewGame}
          title="Back to start"
          tone="quiet"
        >
          <XIcon aria-hidden="true" weight="bold" />
        </GameButton>
        <h1 id="results-title" ref={heading} tabIndex={-1}>
          {resultTitle}
        </h1>
        <SettingsButton onClick={onOpenSettings} />
      </div>
      {mode.kind === 'daily' ? (
        <div className="results__daily-meta">
          <p className="game-mode">{formatDailyDate(mode.date)}</p>
          {dailyStreak > 0 ? (
            <CatchCombo celebrate count={dailyStreak} />
          ) : null}
        </div>
      ) : null}

      <dl className="results-list">
        {mode.kind === 'league' && !leagueVictory ? (
          <div>
            <dt>Reached</dt>
            <dd>{getLeagueStage(result.answers.length).heading}</dd>
          </div>
        ) : null}
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
          <dd>
            {modifiers.timerDisplay === 'milliseconds' &&
            result.elapsedMilliseconds !== undefined
              ? formatDurationMilliseconds(result.elapsedMilliseconds)
              : formatDuration(result.elapsedSeconds)}
          </dd>
        </div>
        <div>
          <dt>Knowledge</dt>
          <dd>{formatScore(getKnowledgePoints(result.answers))}</dd>
        </div>
        <div>
          <dt>Speed</dt>
          <dd>{formatScore(getSpeedBonus(result.answers))}</dd>
        </div>
        <div>
          <dt>Mastery</dt>
          <dd>{formatScore(getMasteryBonus(result.answers))}</dd>
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
              <span aria-hidden="true">
                {answer.correct ? (
                  <CheckIcon weight="bold" />
                ) : (
                  <XIcon weight="bold" />
                )}
              </span>
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
      </div>

      {!resultSaved ? (
        <p className="personal-best personal-best--warning" role="alert">
          This result could not be saved. Keep this tab open or enable browser
          storage.
        </p>
      ) : highScoreLabel ? (
        <p className="personal-best">
          {isNewBest ? (
            <strong>New {highScoreLabel} best!</strong>
          ) : (
            `${highScoreLabel} best`
          )}{' '}
          {formatScore(bestResult.score)} points
        </p>
      ) : null}

      <TrainerProgressSummary
        leagueVictory={leagueVictory}
        onOpenTrainerCard={onOpenTrainerCard}
        progressChanges={progressChanges}
      />

      {mode.kind === 'daily' && resultSaved ? (
        <DailyReminderPrompt dailyDate={mode.date} />
      ) : null}

      {mode.kind === 'training' ? (
        <div className="results__actions results__actions--training">
          <GameButton onClick={onTrainAgain}>Train again</GameButton>
          <ShareResultButton mode={mode} result={result} tone="quiet" />
        </div>
      ) : mode.kind === 'league' ? (
        <div className="results__actions">
          <GameButton onClick={onRetryLeague}>
            {leagueVictory ? 'League rematch' : 'Retry League'}
          </GameButton>
        </div>
      ) : (
        <div className="results__actions">
          <ShareResultButton mode={mode} result={result} />
        </div>
      )}
    </section>
  );
};
