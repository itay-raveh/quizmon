import { useEffect, useRef } from 'react';
import { getModeLabel } from '@/game/daily';
import {
  formatDuration,
  formatDurationMilliseconds,
  getAnswerPoints,
  getCorrectOptions,
  getQuestionTitle,
} from '@/game/game';
import { getLeagueStageLabel } from '@/game/league';
import { formatPokemonName, formatPokemonTypes } from '@/game/format';
import type {
  AnswerFlow,
  AnswerResult,
  GameMode,
  QuestionData,
  QuestionPrompt as QuestionPromptData,
  TimerDisplay,
} from '@/game/types';
import { ChampionSearch } from './ChampionSearch';
import { GameButton } from './GameButton';
import { XIcon } from './icons';
import { LeagueProgress } from './LeagueProgress';
import { Progress } from './Progress';
import { QuestionAnswers } from './QuestionAnswers';
import { QuestionArtwork } from './QuestionArtwork';
import { QuestionClues } from './QuestionClues';
import { QuestionInstruction } from './QuestionInstruction';
import { TypeBadges } from './TypeBadge';
import { useQuestionAnswer } from './useQuestionAnswer';

const subjectTypeRevealQuestionTypes = new Set<QuestionData['questionType']>([
  'counter-pick',
  'type-check',
  'type-twins',
  'type-matchup',
]);

interface QuestionProps {
  answerFlow: AnswerFlow;
  elapsedMilliseconds: number;
  elapsedSeconds: number;
  interactionPaused: boolean;
  mode: GameMode;
  nextQuestion?: QuestionData;
  number: number;
  onAnswerRecorded?: (answer: AnswerResult) => void;
  onAnswer: (answer: AnswerResult) => void;
  onFeedbackStart: () => number;
  onNewGame: () => void;
  question: QuestionData;
  timerDisplay: TimerDisplay;
  total: number;
}

const QuestionPrompt = ({
  className,
  id,
  prompt,
}: {
  className: string;
  id: string;
  prompt: QuestionPromptData;
}) => (
  <p className={className} id={id}>
    {prompt.kind === 'text' ? (
      prompt.text
    ) : (
      <>
        {prompt.before}
        <span className="question__subject">
          <b>{formatPokemonName(prompt.name)}</b>{' '}
          <span className="question__subject-number">
            (No. {String(prompt.dexNumber).padStart(4, '0')})
          </span>
        </span>
        {prompt.after}
      </>
    )}
  </p>
);

const formatCorrectAnswer = (question: QuestionData): string => {
  const names = getCorrectOptions(question).map(formatPokemonName);
  if (names.length < 2) return names[0] ?? '';
  return `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`;
};

export const Question = ({
  answerFlow,
  elapsedMilliseconds,
  elapsedSeconds,
  interactionPaused,
  mode,
  nextQuestion,
  number,
  onAnswerRecorded,
  onAnswer,
  onFeedbackStart,
  onNewGame,
  question,
  timerDisplay,
  total,
}: QuestionProps) => {
  const heading = useRef<HTMLHeadingElement>(null);
  const advanceButton = useRef<HTMLButtonElement>(null);
  const {
    answerCorrect,
    answered,
    advanceAnswer,
    cluesShown,
    correctOptions,
    finishAnswer,
    revealClue,
    selectedOptions,
    selectOption,
  } = useQuestionAnswer({
    answerFlow,
    elapsedMilliseconds,
    interactionPaused,
    nextQuestion,
    onAnswer,
    onAnswerRecorded,
    onFeedbackStart,
    question,
  });

  useEffect(() => {
    heading.current?.focus();
  }, []);

  useEffect(() => {
    if (answered && answerFlow !== 'instant') advanceButton.current?.focus();
  }, [answerFlow, answered]);

  const isChampion = question.category === 'champion';
  const visualInstruction =
    Boolean(question.visual) ||
    question.questionType === 'ability-check' ||
    question.questionType === 'move-check';
  const isLeague = mode.kind === 'league';
  const modeLabel = isLeague
    ? getLeagueStageLabel(number)
    : mode.kind === 'daily'
      ? getModeLabel(mode)
      : null;
  const championChoicesVisible = isChampion && cluesShown > 0;
  const timerText =
    timerDisplay === 'milliseconds'
      ? formatDurationMilliseconds(elapsedMilliseconds)
      : formatDuration(elapsedSeconds);
  const checkAnswerAction =
    question.answer.interaction !== 'single-choice' && !answered ? (
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
          disabled={answered}
          onClick={onNewGame}
          title="Leave game"
          tone="quiet"
        >
          <XIcon aria-hidden="true" weight="bold" />
        </GameButton>
        <Progress current={number} total={total} />
        <span
          className={`timer ${timerDisplay === 'hidden' ? 'timer--hidden' : ''}`.trim()}
          aria-hidden={timerDisplay === 'hidden'}
          aria-label={
            timerDisplay === 'hidden' ? undefined : `Elapsed time ${timerText}`
          }
        >
          {timerText}
        </span>
      </div>

      {isLeague ? <LeagueProgress currentQuestion={number} /> : null}

      <h1 id="question-title" ref={heading} tabIndex={-1}>
        {getQuestionTitle(question)}
      </h1>
      {modeLabel ? <p className="game-mode">{modeLabel}</p> : null}
      {visualInstruction ? (
        <QuestionPrompt
          className="visually-hidden"
          id="question-prompt"
          prompt={question.prompt}
        />
      ) : null}
      <div className="question__context">
        <div
          className="question__instruction"
          aria-hidden={visualInstruction || undefined}
        >
          {visualInstruction ? (
            <QuestionInstruction question={question} />
          ) : (
            <QuestionPrompt
              className="question__prompt"
              id="question-prompt"
              prompt={question.prompt}
            />
          )}
        </div>
        <div className="question__stimulus">
          {isChampion && !isLeague ? (
            <QuestionClues cluesShown={cluesShown} question={question} />
          ) : null}
          <QuestionArtwork
            answered={answered}
            cluesShown={cluesShown}
            question={question}
          />
        </div>
      </div>

      {answered &&
      question.pokemonTypes.length > 0 &&
      subjectTypeRevealQuestionTypes.has(question.questionType) ? (
        <TypeBadges
          className={question.visual ? 'visually-hidden' : 'question__types'}
          label={`${formatPokemonName(question.pokemonName)} ${question.pokemonTypes.length === 1 ? 'type' : 'types'}: ${formatPokemonTypes(question.pokemonTypes)}.`}
          types={question.pokemonTypes}
        />
      ) : null}

      <div className="question__response">
        {isChampion && !championChoicesVisible && question.searchOptions ? (
          <ChampionSearch
            answered={answered}
            correctOption={correctOptions[0] ?? ''}
            disabled={interactionPaused}
            onAnswer={(option) => finishAnswer([option])}
            options={question.searchOptions}
            selectedOption={selectedOptions[0]}
          />
        ) : (
          <QuestionAnswers
            answered={answered}
            correctOptions={correctOptions}
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
          Check answers
        </span>
        {checkAnswerAction}
        {isChampion &&
        !isLeague &&
        !answered &&
        question.clues &&
        cluesShown <= question.clues.length ? (
          <GameButton className="clue-button" tone="quiet" onClick={revealClue}>
            {cluesShown === 0 ? 'Show 4 choices' : 'Reveal another clue'} ·{' '}
            {getAnswerPoints(question, true, cluesShown + 1)} points
          </GameButton>
        ) : null}
        {answered && answerFlow !== 'instant' ? (
          <GameButton
            className="new-game"
            onClick={advanceAnswer}
            ref={advanceButton}
          >
            {isLeague
              ? number === total || !answerCorrect
                ? 'See result'
                : 'Next question'
              : number === total
                ? 'See results'
                : 'Next question'}
          </GameButton>
        ) : null}
      </div>
    </section>
  );
};
