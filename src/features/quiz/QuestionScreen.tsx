import { presentMeasurementQuestion } from '@/domain/quiz/questions/measurement-presentation';
import { getQuestionRendering } from '@/domain/quiz/question-variants';
import type {
  EntityRendering,
  RevealState,
} from '@/domain/quiz/question-rendering';
import { isVisible, spriteState } from '@/domain/quiz/question-rendering';
import { QuestionSprite, QuestionIdentity } from './QuestionEntity';
import { supplementalItemSprites } from './item-sprites';
import { presentEvolutionQuestion } from '@/domain/quiz/questions/evolution-presentation';
import { presentEffectQuestion } from '@/domain/quiz/questions/effect-presentation';
import { GameButton } from '@/components/GameButton';
import { XIcon } from '@/components/icons';
import { TypeBadges } from '@/components/TypeBadge';
import {
  formatDuration,
  formatDurationMilliseconds,
  formatPokemonName,
  formatPokemonTypes,
  getModeLabel,
} from '@/domain/pokemon/format';
import type { PokemonCatalog, PokemonKnowledge } from '@/domain/pokemon/types';
import { getLeagueStageLabel } from '@/domain/quiz/league';
import { getQuestionTitle } from '@/domain/quiz/question-labels';
import { getAnswerPoints } from '@/domain/quiz/scoring';
import type {
  GameMode,
  QuestionData,
  QuestionPrompt as QuestionPromptData,
} from '@/domain/quiz/types';
import type { TimerDisplay } from '@/domain/settings/types';
import { TrainerTitleMark } from '@/features/trainer/TrainerTitleMark';
import { LeagueProgress } from '@/features/league/LeagueProgress';
import { useEffect, useMemo, useRef } from 'react';
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
  answerPokemon?: PokemonKnowledge;
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
const QuestionPrompt = ({
  className,
  prompt,
  itemSprite,
  itemName,
  policy,
  state,
}: {
  className: string;
  prompt: QuestionPromptData;
  itemSprite?: string;
  itemName?: string;
  policy: EntityRendering;
  state: RevealState;
}) => (
  <p className={className} id="question-prompt">
    {prompt.kind === 'text' ? (
      <>
        {itemName ? (
          <span className="question__item-subject">
            {itemSprite ? (
              <QuestionSprite
                rule={policy.sprite}
                state={state}
                src={itemSprite}
                className="question__item-portrait"
              />
            ) : null}
            {isVisible(policy.name, state) ? <strong>{itemName}</strong> : null}
          </span>
        ) : null}
        {itemName ? prompt.text.replace(itemName, 'it') : prompt.text}
        {prompt.supportingText || itemSprite ? (
          <span className="question__supporting-text">
            {itemSprite && !itemName ? (
              <QuestionSprite
                rule={policy.sprite}
                state={state}
                src={itemSprite}
                className="question__inline-item"
              />
            ) : null}
            {prompt.supportingText}
          </span>
        ) : null}
      </>
    ) : (
      <>
        {prompt.before}
        <QuestionIdentity
          policy={policy}
          state={state}
          className="question__subject"
          inline
          name={prompt.name}
          dexNumber={prompt.dexNumber}
          numberClassName="question__subject-number"
        />
        {prompt.after}
        {prompt.supportingText ? (
          <span className="question__supporting-text">
            {prompt.supportingText}
          </span>
        ) : null}
      </>
    )}
  </p>
);
const formatCorrectAnswer = (question: QuestionData): string => {
  const names = question.answer.correctOptions.map(
    (option) => question.optionLabels?.[option] ?? formatPokemonName(option),
  );
  if (names.length < 2) return names[0] ?? '';
  return `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`;
};
export const QuestionScreen = ({
  answerPokemon,
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
    () =>
      presentEvolutionQuestion(
        presentMeasurementQuestion(
          presentEffectQuestion(storedQuestion, effects),
        ),
        evolutions,
      ),
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
  const revealState = { answered, cluesShown };
  const inlineItem =
    question.subject.kind !== 'pokemon' &&
    question.questionType !== 'item-identification' &&
    question.media.kind === 'pixel-sprite'
      ? question.media.src
      : question.subject.kind === 'item' &&
          question.questionType !== 'item-identification'
        ? supplementalItemSprites[question.subject.name]
        : undefined;
  const visualInstruction =
    !(
      question.prompt.kind === 'pokemon' &&
      question.media.kind === 'none' &&
      !(
        question.visual &&
        ['evolution-shift', 'evolution-endpoints', 'evolution-link'].includes(
          question.visual.kind,
        )
      )
    ) &&
    (Boolean(question.visual) ||
      ['ev-yields', 'hidden-abilities'].includes(question.questionType) ||
      (question.questionType === 'nature-effects' &&
        Boolean(
          question.optionReveals?.[question.answer.correctOptions[0]!],
        )) ||
      question.questionType === 'ability-check' ||
      question.questionType === 'move-check');
  const isLeague = mode.kind === 'league';
  const modeLabel = isLeague
    ? getLeagueStageLabel(number)
    : mode.kind === 'daily'
      ? getModeLabel(mode)
      : null;
  const revealArtworkInPlace =
    question.media.kind === 'pixel-peek' ||
    (question.media.kind === 'sprite' &&
      spriteState(rendering.subject.sprite, { ...revealState, answered: false })
        .silhouette);
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
      {visualInstruction ? (
        <QuestionPrompt
          policy={rendering.subject}
          state={revealState}
          className="visually-hidden"
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
              policy={rendering.subject}
              state={revealState}
              className="question__prompt"
              prompt={question.prompt}
              itemSprite={inlineItem}
              itemName={
                question.questionType === 'held-item-effects'
                  ? formatPokemonName(question.subject.name)
                  : undefined
              }
            />
          )}
        </div>
        {question.suppliedClues?.length ? (
          <div className="clue-board">
            <ol>
              {question.suppliedClues.map((clue) => (
                <li key={clue}>{clue}</li>
              ))}
            </ol>
          </div>
        ) : null}
        {!inlineItem &&
        (spriteState(rendering.subject.sprite, revealState).visible ||
          isVisible(rendering.subject.name, revealState) ||
          isVisible(rendering.subject.number, revealState) ||
          question.visual ||
          cluesShown > 1) ? (
          <div className="question__stimulus">
            {isChampion && !isLeague && cluesShown > 1 ? (
              <QuestionClues cluesShown={cluesShown} question={question} />
            ) : null}
            {answered &&
            usesSearch &&
            !question.visual &&
            !revealArtworkInPlace ? null : (
              <QuestionArtwork
                answered={answered}
                cluesShown={cluesShown}
                question={question}
              />
            )}
          </div>
        ) : null}
      </div>

      {(answered || question.showTypes) &&
      !(
        (question.visual?.kind === 'type-matchup' ||
          question.visual?.kind === 'counter-pick') &&
        question.media.kind === 'pixel-sprite'
      ) &&
      (question.subject.types ?? []).length > 0 &&
      subjectTypeRevealQuestionTypes.has(question.questionType) ? (
        <TypeBadges
          className={
            question.visual && visualInstruction
              ? 'visually-hidden'
              : 'question__types'
          }
          label={`${formatPokemonName(question.subject.name)} ${(question.subject.types ?? []).length === 1 ? 'type' : 'types'}: ${formatPokemonTypes(question.subject.types ?? [])}.`}
          types={question.subject.types ?? []}
        />
      ) : null}

      <div className="question__response">
        {usesSearch &&
        (!isChampion || !championChoicesVisible) &&
        question.searchOptions ? (
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

      {answered && usesSearch && question.media.kind !== 'pixel-peek' ? (
        <div className="question__answer-reveal">
          <strong>Correct answer</strong>
          {answerPokemon?.sprite && !revealArtworkInPlace ? (
            <QuestionSprite
              rule={rendering.related.sprite}
              state={revealState}
              src={answerPokemon.sprite}
            />
          ) : null}
          <QuestionIdentity
            policy={rendering.related}
            state={revealState}
            name={question.subject.name}
            dexNumber={answerPokemon?.speciesId}
          >
            <TypeBadges
              types={question.subject.types ?? []}
              label={formatPokemonTypes(question.subject.types ?? [])}
            />
          </QuestionIdentity>
        </div>
      ) : null}

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
