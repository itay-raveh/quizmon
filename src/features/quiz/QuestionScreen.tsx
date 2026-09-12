import { GameButton } from '@/components/GameButton';
import { XIcon } from '@/components/icons';
import { TypeBadges } from '@/components/TypeBadge';
import {
  formatDuration,
  formatDurationMilliseconds,
  formatPokedexNumber,
  formatPokemonName,
  formatPokemonTypes,
  getModeLabel,
} from '@/domain/pokemon/format';
import type { PokemonCatalog } from '@/domain/pokemon/types';
import { getLeagueStageLabel } from '@/domain/quiz/league';
import { getQuestionTitle } from '@/domain/quiz/question-labels';
import { getAnswerPoints } from '@/domain/quiz/scoring';
import type {
  GameMode,
  QuestionData,
  QuestionPrompt as QuestionPromptData,
} from '@/domain/quiz/types';
import type { TimerDisplay } from '@/domain/settings/types';
import { LeagueProgress } from '@/features/league/LeagueProgress';
import { useEffect, useRef } from 'react';
import { ChampionSearch } from './ChampionSearch';
import { QuestionAnswers } from './QuestionAnswers';
import { QuestionArtwork } from './QuestionArtwork';
import { QuestionClues } from './QuestionClues';
import { QuestionInstruction } from './QuestionInstruction';
import { RoundProgress } from './RoundProgress';
import {
  useQuestionAnswer,
  type UseQuestionAnswerOptions,
} from './useQuestionAnswer';

const subjectTypeRevealQuestionTypes = new Set<QuestionData['questionType']>([
  'counter-pick',
  'type-check',
  'type-twins',
  'type-matchup',
]);

interface QuestionScreenProps extends UseQuestionAnswerOptions {
  typeRelations?: PokemonCatalog['typeRelations'];
  elapsedSeconds: number;
  mode: GameMode;
  number: number;
  onNewGame: () => void;
  timerDisplay: TimerDisplay;
  total: number;
}

const QuestionPrompt = ({
  className,
  prompt,
  hideNumbers = false,
}: {
  className: string;
  hideNumbers?: boolean;
  prompt: QuestionPromptData;
}) => (
  <p className={className} id="question-prompt">
    {prompt.kind === 'text' ? (
      prompt.text
    ) : (
      <>
        {prompt.before}
        <span className="question__subject">
          <b>{formatPokemonName(prompt.name)}</b>{' '}
          {!hideNumbers ? (
            <span className="question__subject-number">
              ({formatPokedexNumber(prompt.dexNumber)})
            </span>
          ) : null}
        </span>
        {prompt.after}
      </>
    )}
  </p>
);

const formatCorrectAnswer = (question: QuestionData): string => {
  const names = question.answer.correctOptions.map(formatPokemonName);
  if (names.length < 2) return names[0] ?? '';
  return `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`;
};

export const QuestionScreen = ({
  answerFlow,
  typeRelations,
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
  question,
  timerDisplay,
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
    if (answered && answerFlow !== 'instant') advanceButton.current?.focus();
  }, [answerFlow, answered]);

  const isChampion = question.category === 'champion';
  const visualInstruction =
    !(question.prompt.kind === 'pokemon' && question.media.kind === 'none') &&
    (Boolean(question.visual) ||
      question.questionType === 'ability-check' ||
      question.questionType === 'move-check');
  const isLeague = mode.kind === 'league';
  const modeLabel = isLeague
    ? getLeagueStageLabel(number)
    : mode.kind === 'daily'
      ? getModeLabel(mode)
      : null;
  const usesSearch =
    question.answer.interaction === 'search' ||
    (isChampion && !question.rulesVersion);
  const championChoicesVisible = isChampion && (!usesSearch || cluesShown > 0);
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
    isChampion && !championChoicesVisible ? 'question--champion-search' : '',
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

      <h1 id="question-title" ref={heading} tabIndex={-1}>
        {getQuestionTitle(question)}
      </h1>
      {modeLabel ? <p className="game-mode">{modeLabel}</p> : null}
      {visualInstruction ? (
        <QuestionPrompt
          className="visually-hidden"
          hideNumbers={question.namesOnly}
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
              hideNumbers={question.namesOnly}
              prompt={question.prompt}
            />
          )}
        </div>
        {question.suppliedClues?.map((clue) => (
          <p key={clue}>{clue}</p>
        ))}
        {!isChampion || cluesShown > 1 || answered ? (
          <div className="question__stimulus">
            {isChampion && !isLeague && cluesShown > 1 ? (
              <QuestionClues cluesShown={cluesShown} question={question} />
            ) : null}
            <QuestionArtwork
              answered={answered}
              cluesShown={cluesShown}
              question={question}
            />
          </div>
        ) : null}
      </div>

      {(answered || question.showTypes) &&
      !(
        (question.visual?.kind === 'type-matchup' ||
          question.visual?.kind === 'counter-pick') &&
        (question.media.kind === 'pixel-sprite' || question.namesOnly)
      ) &&
      question.pokemonTypes.length > 0 &&
      subjectTypeRevealQuestionTypes.has(question.questionType) ? (
        <TypeBadges
          className={
            question.visual && visualInstruction
              ? 'visually-hidden'
              : 'question__types'
          }
          label={`${formatPokemonName(question.pokemonName)} ${question.pokemonTypes.length === 1 ? 'type' : 'types'}: ${formatPokemonTypes(question.pokemonTypes)}.`}
          types={question.pokemonTypes}
        />
      ) : null}

      <div className="question__response">
        {usesSearch &&
        (!isChampion || !championChoicesVisible) &&
        question.searchOptions ? (
          <ChampionSearch
            hideNumbers={Boolean(question.rulesVersion)}
            answered={answered}
            correctOption={question.answer.correctOptions[0] ?? ''}
            disabled={interactionPaused}
            onAnswer={(option) => finishAnswer([option])}
            options={question.searchOptions}
            selectedOption={selectedOptions[0]}
          />
        ) : (
          <QuestionAnswers
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
