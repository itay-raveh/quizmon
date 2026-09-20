import { StatDirection } from './StatDirection';
import { NatureEffect } from './NatureEffect';
import { getQuestionRendering } from '@/domain/quiz/question-variants';
import { usesSearchAnswer } from '@/domain/quiz/question-interaction';
import {
  isVisible,
  spriteState,
  type EntityRendering,
} from '@/domain/quiz/question-rendering';
import { QuestionSprite } from './QuestionEntity';
import {
  QuestionSubject,
  QuestionSubjectIdentity,
  QuestionSubjectTypes,
} from './QuestionSubject';
import { evolutionAnswerSummary } from '@/domain/quiz/questions/evolution-presentation';
import { GenerationLabel } from '@/components/GenerationLabel';
import { RelationArrow, TypeEffectArrow } from '@/components/RelationArrow';
import { Sprite } from '@/components/Sprite';
import { MysteryTypeBadge, TypeBadges } from '@/components/TypeBadge';
import {
  formatPokemonName,
  formatPokemonTypeAnnouncement,
} from '@/domain/pokemon/format';
import type { QuestionData } from '@/domain/quiz/types';
import { Fragment, type CSSProperties } from 'react';
interface QuestionArtworkProps {
  answered: boolean;
  cluesShown: number;
  question: QuestionData;
}
const MysteryType = ({
  answered,
  types,
}: {
  answered: boolean;
  types: readonly string[];
}) => (
  <span className="question-visual__mystery-type">
    <TypeBadges
      className={`question-visual__type-answer ${answered ? '' : 'question-visual__type-answer--concealed'}`}
      types={types}
    />
    {answered ? null : <MysteryTypeBadge />}
  </span>
);
export const QuestionArtwork = ({
  answered,
  cluesShown,
  question,
}: QuestionArtworkProps) => {
  const { visual } = question;
  const rendering = getQuestionRendering(question);
  const state = { answered, cluesShown };
  const subjectTypesVisible =
    answered ||
    (Boolean(question.showTypes) &&
      isVisible(rendering.subject.types ?? 'always', state));
  const media = question.media;
  const answerOnlyPortrait =
    question.questionType === 'field-notes' && usesSearchAnswer(question);
  const subjectVisual = question.optionVisuals?.[question.subject.name];
  const subjectSearchOption = question.searchOptions?.find(
    ({ name }) => name === question.subject.name,
  );
  const pixelSprite =
    media.kind === 'pixel-sprite'
      ? media.src
      : media.kind === 'none' &&
          (question.prompt.kind === 'pokemon' ||
            answerOnlyPortrait ||
            (answered && question.questionType === 'field-notes'))
        ? (subjectVisual?.src ?? subjectSearchOption?.sprite ?? undefined)
        : undefined;
  const subjectDexNumber =
    question.prompt.kind === 'pokemon'
      ? question.prompt.dexNumber
      : (subjectVisual?.dexNumber ?? subjectSearchOption?.dexNumber);
  const subjectPolicy: EntityRendering = [
    'pokedex-scan',
    'whos-that-pokemon',
    'champion',
    'field-notes',
  ].includes(question.questionType)
    ? {
        ...rendering.subject,
        sprite: answerOnlyPortrait ? 'after-answer' : rendering.subject.sprite,
        name: rendering.related.name === 'never' ? 'never' : 'after-answer',
        number: rendering.related.number === 'never' ? 'never' : 'after-answer',
      }
    : rendering.subject;
  const subject: Parameters<typeof QuestionSubject>[0] = {
    policy: subjectPolicy,
    state,
    name: question.subject.name,
    dexNumber: subjectDexNumber,
    src: pixelSprite,
    reservePortrait:
      question.media.kind === 'pixel-sprite' || answerOnlyPortrait,
    concealment: answerOnlyPortrait ? 'blank' : 'question-mark',
  };
  if (
    pixelSprite &&
    (visual?.kind === 'type-check' || visual?.kind === 'type-twins')
  ) {
    return (
      <div className="question-visual" aria-hidden="true">
        <QuestionSubject {...subject}>
          {visual.kind === 'type-check' ? (
            <MysteryType
              answered={answered}
              types={question.subject.types ?? []}
            />
          ) : (
            <QuestionSubjectTypes
              answered={answered || Boolean(question.showTypes)}
              types={question.subject.types ?? []}
            />
          )}
        </QuestionSubject>
      </div>
    );
  }
  if (visual?.kind === 'evolution-endpoints') {
    const requirements =
      question.questionType === 'evolution-conditions' && answered
        ? evolutionAnswerSummary(question)
        : '';
    return (
      <div className="question-visual question-evolution-endpoints">
        {[visual.before, visual.after].map((name, index) => (
          <Fragment key={name}>
            {index ? <RelationArrow /> : null}
            <QuestionSubject
              policy={rendering.related}
              state={state}
              name={name}
              src={visual.stages[name]?.src}
              dexNumber={visual.stages[name]?.dexNumber}
              reservePortrait
            />
          </Fragment>
        ))}
        {requirements ? (
          <p
            className="question-evolution-endpoints__conditions"
            aria-label="Evolution requirements"
          >
            {requirements}
          </p>
        ) : null}
      </div>
    );
  }
  if (visual?.kind === 'evolution-link') {
    return (
      <div
        className="question-visual question-evolution-link"
        aria-hidden="true"
      >
        {[visual.before, question.subject.name, visual.after].map(
          (name, index) => (
            <Fragment key={index}>
              {index > 0 && <RelationArrow />}
              <QuestionSubject
                name={name}
                dexNumber={visual.stages[name]?.dexNumber}
                src={visual.stages[name]?.src}
                policy={index === 1 ? rendering.subject : rendering.related}
                state={state}
                framed
              />
            </Fragment>
          ),
        )}
      </div>
    );
  }
  if (visual?.kind === 'generation-roundup') {
    return (
      <div className="question-visual" aria-hidden="true">
        <strong>
          <GenerationLabel generation={visual.generation} variant="stacked" />
        </strong>
      </div>
    );
  }
  if (visual?.kind === 'type-roundup') {
    return (
      <div className="question-visual" aria-hidden="true">
        <TypeBadges
          className="question-visual__roundup-type"
          types={[visual.type]}
        />
      </div>
    );
  }
  if (question.questionType === 'nature-effects') {
    const effect = question.optionReveals?.[question.answer.correctOptions[0]!];
    if (effect)
      return (
        <div className="question-visual">
          <NatureEffect description={effect} />
        </div>
      );
  }
  if (
    visual?.kind === 'stat-showdown' ||
    visual?.kind === 'measurement-comparison'
  ) {
    return (
      <div className="question-visual" aria-hidden="true">
        <StatDirection
          label={formatPokemonName(
            visual.kind === 'stat-showdown' ? visual.stat : visual.measurement,
          )}
          direction={visual.direction === 'highest' ? 'up' : 'down'}
        />
      </div>
    );
  }
  if (visual?.kind === 'evolution-shift') {
    const { evolution, gainedType } = visual;
    const retainedTypes = evolution.types.filter((type) => type !== gainedType);
    return (
      <div
        className="question-visual question-relation question-relation--evolution"
        aria-hidden="true"
      >
        <QuestionSubject {...subject} framed>
          <span
            style={{
              visibility: isVisible(rendering.subject.types ?? 'always', state)
                ? undefined
                : 'hidden',
            }}
          >
            <TypeBadges types={question.subject.types ?? []} />
          </span>
        </QuestionSubject>
        <div className="question-relation__effect">
          <RelationArrow />
          <span className="question-relation__caption">evolves into</span>
        </div>
        <QuestionSubject
          {...evolution}
          dexNumber={evolution.dexNumber}
          reservePortrait
          src={evolution.src}
          policy={rendering.related}
          state={state}
          framed
        >
          <span
            className="question-visual__evolution-types"
            style={{
              visibility: isVisible(rendering.related.types ?? 'always', state)
                ? undefined
                : 'hidden',
            }}
          >
            {retainedTypes.length > 0 ? (
              <>
                <TypeBadges types={retainedTypes} />
                <span className="question-visual__type-plus">+</span>
              </>
            ) : null}
            <MysteryType answered={answered} types={[gainedType]} />
          </span>
        </QuestionSubject>
      </div>
    );
  }
  if (
    pixelSprite &&
    (visual?.kind === 'type-matchup' || visual?.kind === 'counter-pick')
  ) {
    const answer = question.answer.correctOptions[0];
    const answerVisual = answer ? question.optionVisuals?.[answer] : undefined;
    return (
      <div
        className="question-visual question-relation question-relation--matchup"
        role="img"
        aria-hidden={!subjectTypesVisible || undefined}
        aria-label={formatPokemonTypeAnnouncement(
          question.subject.types ?? [],
          question.subject.name,
        )}
      >
        {visual.kind === 'type-matchup' ? (
          <MysteryType answered={answered} types={answer ? [answer] : []} />
        ) : answer &&
          answerVisual &&
          (rendering.related.name !== 'never' ||
            rendering.related.number !== 'never') ? (
          <QuestionSubject
            name={answer}
            src={answerVisual.src}
            dexNumber={answerVisual.dexNumber}
            policy={rendering.related}
            state={state}
            framed
          />
        ) : (
          <span className="question-visual__pokemon-slot">
            {spriteState(rendering.related.sprite, state).visible &&
            answerVisual ? (
              <QuestionSprite
                rule={rendering.related.sprite}
                state={state}
                className="question-visual__pokemon"
                src={answerVisual.src}
              />
            ) : (
              <span className="question-visual__question-mark">?</span>
            )}
          </span>
        )}
        <TypeEffectArrow multiplier={visual.multiplier} />
        <QuestionSubject {...subject}>
          <QuestionSubjectTypes
            answered={subjectTypesVisible}
            types={question.subject.types ?? []}
          />
        </QuestionSubject>
      </div>
    );
  }
  if (media.kind === 'sprite') {
    const { visible, silhouette } = spriteState(
      rendering.subject.sprite,
      state,
    );
    return (
      <div className="question__artwork">
        <div
          aria-hidden={!visible || undefined}
          style={{ visibility: visible ? undefined : 'hidden' }}
        >
          {rendering.subject.sprite !== 'never' ? (
            <Sprite silhouette={silhouette} src={media.src} />
          ) : null}
        </div>
        {subjectPolicy.name !== 'never' || subjectPolicy.number !== 'never' ? (
          <QuestionSubjectIdentity
            policy={subjectPolicy}
            state={state}
            name={question.subject.name}
            dexNumber={subjectDexNumber}
          />
        ) : null}
      </div>
    );
  }
  if (media.kind === 'pixel-peek') {
    return (
      <>
        <div
          className={`pixel-peek ${answered ? 'pixel-peek--revealed' : ''}`}
          style={{
            visibility: spriteState(rendering.subject.sprite, state).visible
              ? undefined
              : 'hidden',
          }}
        >
          <QuestionSprite
            rule={rendering.subject.sprite}
            state={state}
            className="pixel-peek__image"
            src={media.src}
            alt={
              answered
                ? formatPokemonName(question.subject.name)
                : 'Cropped Pokémon sprite'
            }
            style={
              {
                transformOrigin: `${media.focusX}% ${media.focusY}%`,
                '--pixel-peek-transform':
                  media.zoom === undefined
                    ? undefined
                    : `translate(${50 - media.focusX}%, ${50 - media.focusY}%) scale(${media.zoom})`,
              } as CSSProperties
            }
          />
        </div>
        <div
          className="question-visual__subject"
          style={{ visibility: answered ? undefined : 'hidden' }}
          aria-hidden={!answered || undefined}
        >
          <QuestionSubjectIdentity
            policy={rendering.related}
            state={state}
            name={question.subject.name}
            dexNumber={subjectDexNumber}
          />
        </div>
      </>
    );
  }
  if (pixelSprite && question.subject.kind !== 'pokemon')
    return (
      <div className="question-visual" aria-hidden="true">
        <QuestionSprite
          rule={rendering.subject.sprite}
          state={state}
          className="question-visual__pokemon"
          src={pixelSprite}
        />
      </div>
    );
  return answerOnlyPortrait ||
    (pixelSprite && subjectPolicy.sprite !== 'never') ? (
    <div
      className="question-visual"
      aria-hidden={!answerOnlyPortrait || undefined}
    >
      <QuestionSubject {...subject} />
    </div>
  ) : null;
};
