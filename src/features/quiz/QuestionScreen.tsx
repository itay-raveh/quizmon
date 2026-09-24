import { getQuestionRendering } from '@/domain/quiz/question-variants';
import { showsSearchResponse } from '@/domain/quiz/question-interaction';
import { presentQuestion } from '@/domain/quiz/questions/presentation';
import { GameButton } from '@/components/GameButton';
import { XIcon } from '@/components/icons';
import { formatPokemonName } from '@/domain/pokemon/format';
import {
  formatDuration,
  formatDurationMilliseconds,
  getModeLabel,
} from '@/domain/quiz/format';
import type { PokemonCatalog } from '@/domain/pokemon/types';
import { getLeagueStageLabel } from '@/domain/quiz/league';
import { getQuestionTitle } from '@/domain/quiz/questions/definitions';
import { getAnswerPoints } from '@/domain/quiz/scoring';
import type { GameMode, QuestionData } from '@/domain/quiz/types';
import type { TimerDisplay } from '@/domain/settings/types';
import { TrainerTitleMark } from '@/features/trainer/TrainerTitleMark';
import { LeagueProgress } from '@/features/league/LeagueProgress';
import { useEffect, useMemo, useRef } from 'react';
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
  evolutions?: NonNullable<PokemonCatalog['topics']>['evolutions'];
  effects?: NonNullable<PokemonCatalog['topics']>['effects'];
  elapsedSeconds: number;
  mode: GameMode;
  number: number;
  onNewGame: () => void;
  timerDisplay: TimerDisplay;
  total: number;
}
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
  evolutions,
  effects,
  elapsedMilliseconds,
  questionStartedMilliseconds,
  elapsedSeconds,
  interactionPaused,
  mode,
  nextQuestion,
  number,
  onAssistance,
  onAnswerRecorded,
  onAnswer,
  onFeedbackStart,
  onNewGame,
  question: storedQuestion,
  timerDisplay,
  total,
}: QuestionScreenProps) => {
  const question = useMemo(
    () => presentQuestion(storedQuestion, { effects, evolutions }),
    [storedQuestion, evolutions, effects],
  );
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
    elapsedMilliseconds,
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
  const rendering = getQuestionRendering(question);
  const isLeague = mode.kind === 'league';
  const modeLabel = isLeague
    ? getLeagueStageLabel(number)
    : mode.kind === 'daily'
      ? getModeLabel(mode)
      : null;
  const searchVisible = showsSearchResponse(question, cluesShown);
  const championChoicesVisible = isChampion && !searchVisible;
  const timerHidden = timerDisplay === 'hidden';
  const timerText =
    timerDisplay === 'milliseconds'
      ? formatDurationMilliseconds(elapsedMilliseconds)
      : formatDuration(elapsedSeconds);
  const checkAnswerAction =
    question.answer.interaction === 'multi-select' && !answered ? (
      <GameButton
        className="check-answer"
        disabled={selectedOptions.length === 0}
        onClick={() => finishAnswer(selectedOptions)}
        sound="none"
      >
        Check answers
      </GameButton>
    ) : null;
  const className = [
    'question',
    isChampion ? 'question--champion' : '',
    isLeague ? 'question--league' : '',
    number === 1 ? 'question--enter' : '',
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <section
      className={className}
      aria-describedby="question-prompt"
      aria-labelledby="question-title"
    >
      <div className="question__topline">
        <GameButton
          aria-label="Leave game"
          className="question__leave"
          onClick={onNewGame}
          title="Leave game"
          tone="quiet"
        >
          <XIcon aria-hidden="true" weight="bold" />
        </GameButton>
        <RoundProgress current={number} total={total} />
        <span
          className={`timer ${timerHidden ? 'timer--hidden' : ''}`.trim()}
          aria-hidden={timerHidden}
          aria-label={timerHidden ? undefined : `Elapsed time ${timerText}`}
        >
          {timerText}
        </span>
      </div>

      {isLeague ? <LeagueProgress currentQuestion={number} /> : null}

      <h1
        className="question__title"
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
      {modeLabel ? <p className="game-mode">{modeLabel}</p> : null}
      <QuestionPresentation
        question={question}
        rendering={rendering}
        answered={answered}
        cluesShown={cluesShown}
        isLeague={isLeague}
      />

      <div
        className={`question__response ${searchVisible ? 'question__response--search' : ''}`.trim()}
      >
        {searchVisible && question.searchOptions ? (
          <ChampionSearch
            policy={rendering.search}
            cluesShown={cluesShown}
            answered={answered}
            correctOption={question.answer.correctOptions[0] ?? ''}
            disabled={interactionPaused}
            onAnswer={(option) => finishAnswer([option])}
            options={question.searchOptions}
            selectedOption={selectedOptions[0]}
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

      <div className="question__action-slot">
        <span
          aria-hidden="true"
          className="game-button question__action-reserve"
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
          <GameButton className="clue-button" tone="quiet" onClick={revealClue}>
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
            className="new-game"
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
