import { Disclosure } from '@/components/Disclosure';
import { GameButton } from '@/components/GameButton';
import { LevelLabel } from '@/components/LevelLabel';
import { TrainingLevelButton } from '@/components/TrainingLevelButton';
import { SoundButton } from '@/components/SoundButton';
import { defaultGameSettings } from '@/domain/settings/game-settings';
import { CaretDownIcon, CheckIcon, MinusIcon, XIcon } from '@/components/icons';
import type { TrainerProgressChange } from '@/domain/player/trainer-progression';
import {
  formatDailyDate,
  formatDuration,
  formatDurationMilliseconds,
  formatScore,
  formatScoreMultiplier,
} from '@/domain/quiz/format';
import { generations } from '@/domain/pokemon/types';
import { isLeagueVictory } from '@/domain/quiz/league';
import { getCategoryLabel } from '@/domain/quiz/questions/definitions';
import {
  getScoreBreakdown,
  getRoundAnswerLevel,
  getQuestionScoreFactor,
} from '@/domain/quiz/scoring';
import type { GameMode, GameResult } from '@/domain/quiz/types';
import type { GameSettings } from '@/domain/settings/types';
import { LeagueProgress } from '@/features/league/LeagueProgress';
import { DailyReminderPrompt } from '@/features/reminders/DailyReminderPrompt';
import { ShareResultButton } from '@/features/sharing/ShareResultButton';
import { TrainerProgressSummary } from '@/features/trainer/TrainerProgressSummary';
import { useGameSounds } from '@/lib/audio/sound-context';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { AnimatedScore } from './AnimatedScore';
import { CatchCombo } from '@/features/daily/CatchCombo';
import { markStayedAtLevel, suggestedLevel } from './level-advancement';

interface ResultStat {
  label: string;
  value: string;
  className?: string;
}

interface ResultsScreenProps {
  bestResult: GameResult;
  dailyStreak: number;
  isNewBest: boolean;
  mode: GameMode;
  settings: GameSettings;
  onNewGame: () => void;
  onTrainAgain: () => void;
  onChooseLevel: () => void;
  onStartTraining: () => void;
  onRetryLeague: () => void;
  trainingError?: string;
  result: GameResult;
  resultSaved: boolean;
  roundSeed: string;
  progressChanges: TrainerProgressChange[];
}

export const ResultsScreen = ({
  bestResult,
  dailyStreak,
  isNewBest,
  mode,
  settings,
  onNewGame,
  onTrainAgain,
  onChooseLevel,
  onStartTraining,
  onRetryLeague,
  trainingError,
  result,
  resultSaved,
  roundSeed,
  progressChanges,
}: ResultsScreenProps) => {
  const { playPerfect, playResults, playScoreCount, stopCelebration } =
    useGameSounds();
  const heading = useRef<HTMLHeadingElement>(null);
  const levelButton = useRef<HTMLButtonElement>(null);
  const suggestion = useRef<HTMLElement>(null);
  const suggestionId = useId();
  const [hiddenSuggestionSeed, setHiddenSuggestionSeed] = useState<
    string | null
  >(null);
  const isDaily = mode.kind === 'daily';
  const isLeague = mode.kind === 'league';
  const isTraining = mode.kind === 'training';
  const perfectRound =
    !isLeague && result.correctCount === result.questionCount;
  const nextLevel = isTraining ? suggestedLevel(result, settings.level) : null;
  const suggestionVisible = Boolean(
    nextLevel && hiddenSuggestionSeed !== roundSeed,
  );
  const trainingLevel = settings.level ?? defaultGameSettings.level!;
  const dismissSuggestion = () => {
    if (result.rules) markStayedAtLevel(result.rules.level, roundSeed);
    setHiddenSuggestionSeed(roundSeed);
    levelButton.current?.focus();
  };
  const chooseLevel = () => {
    setHiddenSuggestionSeed(roundSeed);
    onChooseLevel();
  };
  const leagueVictory = isLeague && isLeagueVictory(result);
  const score = useMemo(
    () =>
      getScoreBreakdown(result.answers, (index) =>
        getRoundAnswerLevel(mode, result.rules?.level, index),
      ),
    [mode, result.answers, result.rules?.level],
  );
  const resultStats: ResultStat[] = [
    ...(!isLeague && result.questionCount > 10
      ? [
          {
            label: 'Correct',
            value: `${result.correctCount} / ${result.questionCount}`,
          },
        ]
      : []),
    {
      label: 'Time',
      className: 'results-list__time',
      value:
        settings.timerDisplay === 'milliseconds' &&
        result.elapsedMilliseconds !== undefined
          ? formatDurationMilliseconds(result.elapsedMilliseconds, 'minutes')
          : formatDuration(result.elapsedSeconds, 'minutes'),
    },
    { label: 'Answers', value: formatScore(score.answers) },
    { label: 'Speed', value: formatScore(score.speed) },
  ];
  const highScoreLabel = isTraining ? 'Training' : isDaily ? 'Daily' : null;
  const resultTitle = isDaily
    ? 'Daily complete'
    : isLeague
      ? leagueVictory
        ? 'League Champion'
        : 'League challenge ended'
      : 'Training complete';

  useEffect(() => {
    heading.current?.focus();
  }, []);

  useEffect(() => {
    if (!suggestionVisible || !result.rules) return;
    const dismissOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      markStayedAtLevel(result.rules!.level, roundSeed);
      setHiddenSuggestionSeed(roundSeed);
      if (suggestion.current?.contains(document.activeElement))
        levelButton.current?.focus();
    };
    document.addEventListener('keydown', dismissOnEscape);
    return () => document.removeEventListener('keydown', dismissOnEscape);
  }, [suggestionVisible, result.rules, roundSeed]);

  useEffect(() => {
    if (progressChanges.length === 0) {
      if (result.correctCount === result.questionCount) playPerfect();
      else if (result.score > 0) playResults();
    }

    const stopWhenHidden = () => {
      if (document.hidden) stopCelebration();
    };
    document.addEventListener('visibilitychange', stopWhenHidden);
    return () => {
      stopCelebration();
      document.removeEventListener('visibilitychange', stopWhenHidden);
    };
  }, [
    playPerfect,
    playResults,
    progressChanges.length,
    result.correctCount,
    result.questionCount,
    result.score,
    stopCelebration,
  ]);

  return (
    <section className="game-panel results" aria-labelledby="results-title">
      <div
        className={`results__header ${isDaily && dailyStreak > 0 ? 'results__header--with-combo' : ''}`.trim()}
      >
        <GameButton
          aria-label="Back to start"
          className="results__close"
          onClick={onNewGame}
          title="Back to start"
          tone="quiet"
        >
          <XIcon aria-hidden="true" weight="bold" />
        </GameButton>
        <div className="results__heading">
          <h1 id="results-title" ref={heading} tabIndex={-1}>
            {resultTitle}
          </h1>
          {isDaily ? (
            <p className="results__date">{formatDailyDate(mode.date)}</p>
          ) : null}
          {result.rules ? (
            <Disclosure
              className="results__settings"
              label={
                <>
                  <span>
                    <LevelLabel level={result.rules.level} /> ·{' '}
                    {generations.every((generation) =>
                      result.rules?.generations.includes(generation),
                    )
                      ? 'All generations'
                      : result.rules.generations.length === 1
                        ? `Gen ${result.rules.generations[0]}`
                        : `${result.rules.generations.length} generations`}
                  </span>
                  <CaretDownIcon aria-hidden="true" weight="bold" />
                </>
              }
            >
              <dl>
                <div>
                  <dt>Generations</dt>
                  <dd>{result.rules.generations.join(', ')}</dd>
                </div>
                <div>
                  <dt>Forms</dt>
                  <dd>{result.rules.formGroups.join(', ')}</dd>
                </div>
              </dl>
            </Disclosure>
          ) : null}
        </div>
        {isDaily && dailyStreak > 0 ? (
          <CatchCombo
            className="results__combo"
            celebrate
            count={dailyStreak}
          />
        ) : null}
      </div>

      <div className="result-score">
        {perfectRound ? (
          <div className="result-score__perfect">
            <strong>Perfect round</strong>
          </div>
        ) : null}
        <div className="score">
          <strong aria-hidden="true">
            <AnimatedScore
              playSound={playScoreCount}
              format={formatScore}
              value={result.score}
            />
          </strong>
          <span className="visually-hidden">
            Score {formatScore(result.score)}
          </span>
        </div>

        {!resultSaved ? (
          <p className="personal-best personal-best--warning" role="alert">
            This result could not be saved. Keep this tab open or enable browser
            storage.
          </p>
        ) : highScoreLabel ? (
          <p className="personal-best">
            {isNewBest ? (
              <strong>{`New ${highScoreLabel} best!`}</strong>
            ) : (
              `${highScoreLabel} best`
            )}{' '}
            {formatScore(bestResult.score)}
          </p>
        ) : null}
      </div>
      <div className="result-details">
        <dl
          className={`results-list ${settings.timerDisplay === 'milliseconds' ? 'results-list--precise' : ''}`.trim()}
        >
          {resultStats.map(({ label, value, className }) => (
            <div className={className} key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>

        {isLeague ? (
          <LeagueProgress
            currentQuestion={result.answers.length}
            completed={leagueVictory}
          />
        ) : result.questionCount <= 10 ? (
          <ol
            className={`answer-trail${!isLeague ? ' answer-trail--training' : ''}`}
            aria-label={
              !isLeague
                ? 'Question results and score factors'
                : 'Question results'
            }
          >
            {result.answers.map((answer, index) => {
              const unavailable = !answer.questionType;
              const categoryLabel = getCategoryLabel(answer.category);
              const outcome = answer.correct ? 'correct' : 'incorrect';
              const factor =
                !isLeague && answer.correct && answer.questionType
                  ? formatScoreMultiplier(
                      getQuestionScoreFactor(
                        answer.questionType,
                        getRoundAnswerLevel(mode, result.rules?.level, index),
                        answer.cluesUsed,
                      ),
                    )
                  : undefined;
              const description = unavailable
                ? 'Unavailable question: no points'
                : `${categoryLabel}: ${outcome}${factor ? `, ${factor} question factor` : ''}`;
              return (
                <li
                  className={
                    unavailable
                      ? 'answer-trail--unavailable'
                      : answer.correct
                        ? 'answer-trail--correct'
                        : undefined
                  }
                  key={`${answer.category}-${index}`}
                  title={description}
                >
                  <span
                    aria-hidden="true"
                    style={
                      !isLeague && answer.correct
                        ? { animationDelay: `${index * 130}ms` }
                        : undefined
                    }
                  >
                    {unavailable ? (
                      <MinusIcon weight="bold" />
                    ) : answer.correct ? (
                      <CheckIcon weight="bold" />
                    ) : (
                      <XIcon weight="bold" />
                    )}
                  </span>
                  {!isLeague ? (
                    <span className="answer-trail__factor" aria-hidden="true">
                      {factor}
                    </span>
                  ) : null}
                  <span className="visually-hidden">{description}</span>
                </li>
              );
            })}
          </ol>
        ) : null}
      </div>
      {trainingError ? <p role="alert">{trainingError}</p> : null}
      {!isLeague ? (
        <div
          className={`results__actions ${isTraining ? 'results__actions--training' : 'results__actions--paired'}`}
        >
          <GameButton
            onClick={() => {
              if (isTraining) {
                if (nextLevel && result.rules)
                  markStayedAtLevel(result.rules.level, roundSeed);
                onTrainAgain();
              } else onStartTraining();
            }}
          >
            {isTraining ? (
              <>
                Train <LevelLabel level={trainingLevel} /> again
              </>
            ) : (
              'Start training'
            )}
          </GameButton>
          {isTraining ? (
            <div className="results__level-control">
              <TrainingLevelButton
                ref={levelButton}
                level={trainingLevel}
                aria-describedby={suggestionVisible ? suggestionId : undefined}
                onClick={chooseLevel}
              />
              {suggestionVisible && nextLevel ? (
                <aside
                  className="level-advancement-bubble"
                  aria-label="Training suggestion"
                  ref={suggestion}
                >
                  <p id={suggestionId} role="status">
                    Ready to try <LevelLabel level={nextLevel} />?
                  </p>
                  <SoundButton
                    className="level-advancement-bubble__choose"
                    onClick={chooseLevel}
                  >
                    Choose level
                  </SoundButton>
                  <SoundButton
                    className="level-advancement-bubble__close"
                    aria-label="Dismiss training suggestion"
                    onClick={dismissSuggestion}
                  >
                    <XIcon aria-hidden="true" weight="bold" />
                  </SoundButton>
                </aside>
              ) : null}
            </div>
          ) : null}
          <ShareResultButton
            aria-label="Share result"
            mode={mode}
            result={result}
            tone="quiet"
          >
            <span className={isTraining ? 'results__share-label' : undefined}>
              Share
            </span>
          </ShareResultButton>
        </div>
      ) : (
        <div className="results__actions">
          <GameButton onClick={onRetryLeague}>
            {leagueVictory ? 'League rematch' : 'Retry League'}
          </GameButton>
        </div>
      )}
      {isDaily && resultSaved ? (
        <DailyReminderPrompt dailyDate={mode.date} />
      ) : null}

      <TrainerProgressSummary
        leagueVictory={leagueVictory}
        progressChanges={progressChanges}
      />
    </section>
  );
};
