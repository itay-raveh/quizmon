import { TypeBadges } from '@/components/TypeBadge';
import {
  formatPokemonName,
  formatPokemonTypeAnnouncement,
} from '@/domain/pokemon/format';
import type {
  QuestionData,
  QuestionPrompt as QuestionPromptData,
} from '@/domain/quiz/types';
import {
  isVisible,
  type EntityRendering,
  type QuestionRendering,
  type RevealState,
} from '@/domain/quiz/question-rendering';
import { QuestionIdentity, QuestionSprite } from './QuestionEntity';
import { QuestionClues } from './QuestionClues';
import { QuestionArtwork } from './QuestionArtwork';
import { QuestionInstruction } from './QuestionInstruction';
import { usesVisualInstruction } from './question-instruction-policy';
import { getQuestionView } from '@/domain/quiz/question-presentation';
import { supplementalItemSprites } from './item-sprites';

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
}) => {
  return (
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
              {isVisible(policy.name, state) ? (
                <strong>{itemName}</strong>
              ) : null}
            </span>
          ) : null}
          {itemName ? prompt.text.replace(itemName, 'it') : prompt.text}
          {prompt.description ? (
            <span className="question__move-description">
              {prompt.description}
            </span>
          ) : null}
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
};
export const QuestionPresentation = ({
  question,
  rendering,
  answered,
  cluesShown,
  isLeague,
}: {
  question: QuestionData;
  rendering: QuestionRendering;
  answered: boolean;
  cluesShown: number;
  isLeague: boolean;
}) => {
  const revealState = { answered, cluesShown };
  const view = getQuestionView(question);
  const visualInstruction = usesVisualInstruction(question);
  const isChampion = question.category === 'champion';
  const inlineItem = view.subject?.inlineItem
    ? question.media.kind === 'pixel-sprite'
      ? question.media.src
      : supplementalItemSprites[question.subject.name]
    : undefined;
  return (
    <>
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
                view.subject?.inlineItem === 'named'
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
        {!inlineItem ? (
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
        question.media.kind === 'pixel-sprite'
      ) &&
      (question.subject.types ?? []).length > 0 &&
      view.subject?.types === 'after-answer' ? (
        <TypeBadges
          className={
            question.visual && visualInstruction
              ? 'visually-hidden'
              : 'question__types'
          }
          label={formatPokemonTypeAnnouncement(
            question.subject.types ?? [],
            question.subject.name,
          )}
          types={question.subject.types ?? []}
        />
      ) : null}
    </>
  );
};
