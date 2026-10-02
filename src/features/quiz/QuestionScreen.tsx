import * as styles from '../../styles/classes.css.ts';
import { FeedbackButton } from '@/app/FeedbackButton';
import { getQuestionRendering } from '@/domain/quiz/variants';
import { getQuestionView } from '@/domain/quiz/presentation';
import {
  showsCorrectSearchAnswerInArtwork,
  showsSearchResponse,
} from '@/domain/quiz/interaction';
import { GameButton } from '@/components/GameButton';
import { XIcon } from '@/components/icons';
import { formatPokemonName } from '@/domain/pokemon/format';
import {
  formatDuration,
  formatDurationMilliseconds,
} from '@/domain/quiz/format';
import type { PokemonCatalog } from '@/domain/pokemon/types';
import { getQuestionTitle } from '@/domain/quiz/questions/definitions';
import { getAnswerPoints } from '@/domain/quiz/scoring';
import type { GameMode, QuestionData } from '@/domain/quiz/types';
import type { TimerDisplay } from '@/domain/settings/types';
import { TrainerTitleMark } from '@/features/trainer/TrainerTitleMark';
import { LeagueProgress } from '@/features/league/LeagueProgress';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ChampionSearch } from './ChampionSearch';
import { QuestionAnswers } from './QuestionAnswers';
import { QuestionPresentation } from './QuestionPresentation';
import { RoundProgress } from './RoundProgress';
import {
  useQuestionAnswer,
  type UseQuestionAnswerOptions,
} from './useQuestionAnswer';
interface QuestionScreenProps extends UseQuestionAnswerOptions {
  typeRelations?: PokemonCatalog['typeRelations'];
  mode: GameMode;
  number: number;
  onNewGame: () => void;
  timerDisplay: TimerDisplay;
  timerRunning: boolean;
  total: number;
}
const QuestionTimer = ({
  getElapsedMilliseconds,
  timerDisplay,
  timerRunning,
}: Pick<
  QuestionScreenProps,
  'getElapsedMilliseconds' | 'timerDisplay' | 'timerRunning'
>) => {
  const [elapsed, setElapsed] = useState(getElapsedMilliseconds);
  useEffect(() => {
    if (!timerRunning || timerDisplay === 'hidden') return;
    const update = () => setElapsed(getElapsedMilliseconds());
    const initial = window.setTimeout(update, 0);
    const interval = window.setInterval(
      update,
      timerDisplay === 'milliseconds' ? 50 : 250,
    );
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(interval);
    };
  }, [getElapsedMilliseconds, timerDisplay, timerRunning]);
  const hidden = timerDisplay === 'hidden';
  const displayElapsed = timerRunning ? elapsed : getElapsedMilliseconds();
  const text =
    timerDisplay === 'milliseconds'
      ? formatDurationMilliseconds(displayElapsed)
      : formatDuration(Math.floor(displayElapsed / 1000));
  return (
    <span
      className={`${styles.timer} ${hidden ? styles.timerHidden : ''}`.trim()}
      aria-hidden={hidden}
      aria-label={hidden ? undefined : `Elapsed time ${text}`}
    >
      {text}
    </span>
  );
};
const formatCorrectAnswer = (question: QuestionData): string => {
  const names = question.answer.correctOptions.map(
    (option) => question.optionLabels?.[option] ?? formatPokemonName(option),
  );
  if (names.length < 2) return names[0] ?? '';
  return `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`;
};
export const QuestionScreen = ({
  answerFlow,
  typeRelations,
  getElapsedMilliseconds,
  questionStartedMilliseconds,
  interactionPaused,
  mode,
  nextQuestion,
  number,
  onAssistance,
  onAnswerRecorded,
  onAnswer,
  onFeedbackStart,
  onNewGame,
  question,
  timerDisplay,
  timerRunning,
  total,
}: QuestionScreenProps) => {
  const heading = useRef<HTMLHeadingElement>(null);
  const advanceButton = useRef<HTMLButtonElement>(null);
  const {
    answerCorrect,
    answered,
    advanceAnswer,
    cluesShown,
    finishAnswer,
    revealClue,
    selectedOptions,
    selectOption,
  } = useQuestionAnswer({
    answerFlow,
    getElapsedMilliseconds,
    questionStartedMilliseconds,
    interactionPaused,
    nextQuestion,
    onAnswer,
    onAssistance,
    onAnswerRecorded,
    onFeedbackStart,
    question,
  });
  useEffect(() => {
    heading.current?.focus();
  }, []);
  useEffect(() => {
    if (answered && answerFlow !== 'instant')
      advanceButton.current?.focus({ preventScroll: true });
  }, [answerFlow, answered]);
  const isChampion = question.category === 'champion';
  const rendering = useMemo(() => getQuestionRendering(question), [question]);
  const answerView = useMemo(
    () => getQuestionView(question).answer,
    [question],
  );
  const isLeague = mode.kind === 'league';
  const searchVisible = showsSearchResponse(question, cluesShown);
  const championChoicesVisible = isChampion && !searchVisible;
  const checkAnswerAction =
    question.answer.interaction === 'multi-select' && !answered ? (
      <GameButton
        className={styles.checkAnswer}
        disabled={selectedOptions.length === 0}
        onClick={() => finishAnswer(selectedOptions)}
        sound="none"
      >
        Check answers
      </GameButton>
    ) : null;
  const className = [
    'game-panel',
    styles.question,
    isChampion ? styles.questionChampion : '',
    isLeague ? styles.questionLeague : '',
    number === 1 ? styles.questionEnter : '',
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <section
      className={className}
      aria-describedby="question-prompt"
      aria-labelledby="question-title"
    >
      <header className={styles.questionTopline}>
        <GameButton
          aria-label="Leave game"
          className={styles.questionLeave}
          onClick={onNewGame}
          title="Leave game"
          tone="quiet"
        >
          <XIcon aria-hidden="true" weight="bold" />
        </GameButton>
        <RoundProgress current={number} total={total} />
        <QuestionTimer
          getElapsedMilliseconds={getElapsedMilliseconds}
          timerDisplay={timerDisplay}
          timerRunning={timerRunning}
        />
        <FeedbackButton />
      </header>

      {isLeague ? <LeagueProgress currentQuestion={number} /> : null}

      <h1
        className={styles.questionTitle}
        id="question-title"
        ref={heading}
        tabIndex={-1}
      >
        {question.category !== 'champion' &&
        question.category !== 'knowledge' ? (
          <TrainerTitleMark plain tier={0} specialty={question.category} />
        ) : null}
        <span>{getQuestionTitle(question)}</span>
      </h1>
      <QuestionPresentation
        question={question}
        rendering={rendering}
        answered={answered}
        cluesShown={cluesShown}
        isLeague={isLeague}
      />

      <div
        className={`${styles.questionResponse} ${searchVisible ? styles.questionResponseSearch : ''}`.trim()}
      >
        {searchVisible && question.searchOptions ? (
          <ChampionSearch
            answerKind={
              answerView.kind === 'item'
                ? 'item'
                : answerView.kind === 'pokemon'
                  ? 'pokemon'
                  : 'ability'
            }
            policy={rendering.search}
            cluesShown={cluesShown}
            answered={answered}
            correctOption={question.answer.correctOptions[0] ?? ''}
            disabled={interactionPaused}
            onAnswer={(option) => finishAnswer([option])}
            options={question.searchOptions}
            selectedOption={selectedOptions[0]}
            showCorrectAnswerBanner={
              !showsCorrectSearchAnswerInArtwork(question)
            }
          />
        ) : (
          <QuestionAnswers
            cluesShown={cluesShown}
            typeRelations={typeRelations}
            answered={answered}
            onSelect={selectOption}
            question={question}
            selectedOptions={selectedOptions}
          />
        )}
      </div>

      <span className="visually-hidden" aria-live="polite">
        {answerCorrect
          ? 'Correct.'
          : answered
            ? `Incorrect. Correct answer: ${formatCorrectAnswer(question)}.`
            : ''}
      </span>

      <div className={styles.questionActionSlot}>
        <span
          aria-hidden="true"
          className={`game-button ${styles.questionActionReserve}`}
        >
          {isChampion && !isLeague && championChoicesVisible
            ? `Reveal another clue · ${getAnswerPoints(question, true, 3)} points`
            : 'Check answers'}
        </span>
        {checkAnswerAction}
        {isChampion &&
        !isLeague &&
        question.assistanceAllowed !== false &&
        !answered &&
        question.clues &&
        cluesShown <= question.clues.length ? (
          <GameButton
            className={styles.clueButton}
            tone="quiet"
            onClick={revealClue}
          >
            {cluesShown === 0 ? 'Show 4 choices' : 'Reveal another clue'} ·{' '}
            {getAnswerPoints(
              question,
              true,
              cluesShown + 1 + (question.initialClues ?? 0),
            )}{' '}
            points
          </GameButton>
        ) : null}
        {answered && answerFlow !== 'instant' ? (
          <GameButton
            className={styles.newGame}
            onClick={advanceAnswer}
            ref={advanceButton}
          >
            {number === total || (isLeague && !answerCorrect)
              ? isLeague
                ? 'See result'
                : 'See results'
              : 'Next question'}
          </GameButton>
        ) : null}
      </div>
    </section>
  );
};
