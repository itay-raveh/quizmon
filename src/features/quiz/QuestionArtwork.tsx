import * as styles from './styles/classes.css.ts';
import { StatDirection } from './StatDirection';
import { NatureEffect } from './NatureEffect';
import { getQuestionRendering } from '@/domain/quiz/variants';
import { usesSearchAnswer } from '@/domain/quiz/interaction';
import {
  isVisible,
  spriteState,
  type EntityRendering,
} from '@/domain/quiz/rendering';
import {
  ItemRenderable,
  PokemonRenderable,
  QuestionSprite,
} from './QuestionEntity';
import { QuestionSubject } from './QuestionSubject';
import { GenerationLabel } from '@/components/GenerationLabel';
import { RelationArrow, TypeEffectArrow } from './RelationArrow';
import { Sprite } from './Sprite';
import { MysteryTypeBadge, TypeBadges } from '@/components/TypeBadge';
import {
  formatPokemonName,
  formatPokemonTypeAnnouncement,
} from '@/domain/pokemon/format';
import type { QuestionData } from '@/domain/quiz/types';
import { getQuestionView } from '@/domain/quiz/presentation';
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
  <span className={styles.questionVisualMysteryType}>
    <TypeBadges
      className={`${styles.questionVisualTypeAnswer} ${answered ? '' : styles.questionVisualTypeAnswerConcealed}`}
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
  const view = getQuestionView(question);
  const rendering = getQuestionRendering(question);
  const state = { answered, cluesShown };
  const subjectTypesVisible = isVisible(
    rendering.subject.types ?? 'never',
    state,
  );
  const media = question.media;
  const answerOnlyPortrait =
    (question.media.kind === 'none' ||
      question.media.kind === 'pixel-sprite') &&
    usesSearchAnswer(question) &&
    rendering.subject.sprite?.reveal === 'after-answer';
  const subjectVisual = question.optionVisuals?.[question.subject.name];
  const subjectSearchOption = question.searchOptions?.find(
    ({ name }) => name === question.subject.name,
  );
  const pixelSprite =
    media.kind === 'pixel-sprite'
      ? media.src
      : media.kind === 'none' &&
          (question.prompt.kind === 'pokemon' || answerOnlyPortrait)
        ? (subjectVisual?.src ?? subjectSearchOption?.sprite ?? undefined)
        : undefined;
  const subjectDexNumber =
    question.prompt.kind === 'pokemon'
      ? question.prompt.dexNumber
      : (subjectVisual?.dexNumber ?? subjectSearchOption?.dexNumber);
  const subjectPolicy: EntityRendering = rendering.subject;
  const subject: Parameters<typeof QuestionSubject>[0] = {
    policy: subjectPolicy,
    state,
    name: question.subject.name,
    dexNumber: subjectDexNumber,
    src: pixelSprite,
    types: question.subject.types,
    reservePortrait:
      question.media.kind === 'pixel-sprite' || answerOnlyPortrait,
    concealment: answerOnlyPortrait ? 'blank' : 'question-mark',
  };
  if (
    pixelSprite &&
    (visual?.kind === 'pokemonTypes' || visual?.kind === 'dualTypeMatch')
  ) {
    return (
      <div className={styles.questionVisual} aria-hidden="true">
        <QuestionSubject
          {...subject}
          types={
            visual.kind === 'pokemonTypes' ? undefined : question.subject.types
          }
        >
          {visual.kind === 'pokemonTypes' ? (
            <MysteryType
              answered={isVisible(rendering.subject.types ?? 'never', state)}
              types={question.subject.types ?? []}
            />
          ) : null}
        </QuestionSubject>
      </div>
    );
  }
  if (visual?.kind === 'evolution-endpoints') {
    return (
      <div
        className={`${styles.questionVisual} ${styles.questionEvolutionEndpoints}`}
      >
        {[visual.before, visual.after].map((name, index) => (
          <Fragment key={name}>
            {index ? <RelationArrow /> : null}
            <QuestionSubject
              policy={rendering.related}
              state={state}
              name={name}
              src={visual.stages[name]?.src}
              dexNumber={visual.stages[name]?.dexNumber}
              types={visual.stages[name]?.types}
              reservePortrait
            />
          </Fragment>
        ))}
      </div>
    );
  }
  if (visual?.kind === 'evolutionChain') {
    return (
      <div
        className={`${styles.questionVisual} ${styles.questionEvolutionChain}`}
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
                types={visual.stages[name]?.types}
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
  if (visual?.kind === 'pokemonByGeneration') {
    return (
      <div className={styles.questionVisual} aria-hidden="true">
        <strong>
          <GenerationLabel generation={visual.generation} variant="stacked" />
        </strong>
      </div>
    );
  }
  if (visual?.kind === 'pokemonByType') {
    return (
      <div className={styles.questionVisual} aria-hidden="true">
        <TypeBadges
          className={styles.questionVisualRoundupType}
          types={[visual.type]}
        />
      </div>
    );
  }
  if (view.answer.kind === 'text' && view.answer.detail === 'nature') {
    const effect = question.optionReveals?.[question.answer.correctOptions[0]!];
    if (effect)
      return (
        <div className={styles.questionVisual}>
          <NatureEffect description={effect} />
        </div>
      );
  }
  if (
    visual?.kind === 'statExtremes' ||
    visual?.kind === 'measurement-comparison'
  ) {
    return (
      <div className={styles.questionVisual} aria-hidden="true">
        <StatDirection
          label={formatPokemonName(
            visual.kind === 'statExtremes' ? visual.stat : visual.measurement,
          )}
          direction={visual.direction === 'highest' ? 'up' : 'down'}
        />
      </div>
    );
  }
  if (visual?.kind === 'evolutionGainedType') {
    const { evolution, gainedType } = visual;
    const retainedTypes = evolution.types.filter((type) => type !== gainedType);
    return (
      <div
        className={`${styles.questionVisual} ${styles.questionRelation} ${styles.questionRelationEvolution}`}
        aria-hidden="true"
      >
        <QuestionSubject {...subject} types={undefined} framed>
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
        <div className={styles.questionRelationEffect}>
          <RelationArrow />
          <span className={styles.questionRelationCaption}>evolves into</span>
        </div>
        <QuestionSubject
          {...evolution}
          dexNumber={evolution.dexNumber}
          reservePortrait
          src={evolution.src}
          types={undefined}
          policy={rendering.related}
          state={state}
          framed
        >
          <span
            className={styles.questionVisualEvolutionTypes}
            style={{
              visibility: isVisible(rendering.related.types ?? 'always', state)
                ? undefined
                : 'hidden',
            }}
          >
            {retainedTypes.length > 0 ? (
              <>
                <TypeBadges types={retainedTypes} />
                <span className={styles.questionVisualTypePlus}>+</span>
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
    (visual?.kind === 'typeMatchup' ||
      visual?.kind === 'superEffectiveAttacker')
  ) {
    const answer = question.answer.correctOptions[0];
    const answerVisual = answer ? question.optionVisuals?.[answer] : undefined;
    return (
      <div
        className={`${styles.questionVisual} ${styles.questionRelation} ${styles.questionRelationMatchup}`}
        role="img"
        aria-hidden={!subjectTypesVisible || undefined}
        aria-label={formatPokemonTypeAnnouncement(
          question.subject.types ?? [],
          question.subject.name,
        )}
      >
        {visual.kind === 'typeMatchup' ? (
          <MysteryType answered={answered} types={answer ? [answer] : []} />
        ) : answer && answerVisual ? (
          <QuestionSubject
            name={answer}
            src={answerVisual.src}
            dexNumber={answerVisual.dexNumber}
            types={answerVisual.types}
            policy={rendering.related}
            state={state}
            framed
          />
        ) : (
          <span className={styles.questionVisualPokemonSlot}>
            {spriteState(rendering.related.sprite, state).visible &&
            answerVisual?.src ? (
              <QuestionSprite
                rule={rendering.related.sprite}
                state={state}
                className={styles.questionVisualPokemon}
                src={answerVisual.src}
              />
            ) : (
              <span className={styles.questionVisualQuestionMark}>?</span>
            )}
          </span>
        )}
        <TypeEffectArrow multiplier={visual.multiplier} />
        <QuestionSubject
          {...subject}
          policy={{
            ...subjectPolicy,
            types: subjectTypesVisible ? 'always' : 'never',
          }}
        />
      </div>
    );
  }
  if (media.kind === 'sprite') {
    const { visible, silhouette } = spriteState(
      rendering.subject.sprite,
      state,
    );
    return (
      <div className={styles.questionArtwork}>
        <div
          aria-hidden={!visible || undefined}
          style={{ visibility: visible ? undefined : 'hidden' }}
        >
          {rendering.subject.sprite !== null ? (
            <Sprite silhouette={silhouette} src={media.src} />
          ) : null}
        </div>
        <PokemonRenderable
          policy={{ ...subjectPolicy, sprite: null }}
          state={state}
          name={question.subject.name}
          dexNumber={subjectDexNumber}
          types={question.subject.types}
          identityClassName={styles.questionVisualSubjectName}
          numberClassName={styles.questionVisualSubjectNumber}
          typesClassName={styles.questionVisualSubjectTypes}
        />
      </div>
    );
  }
  if (media.kind === 'pokemonFromPixelCrop') {
    return (
      <>
        <div
          className={`${styles.pixelPeek} ${answered ? styles.pixelPeekRevealed : ''}`}
          style={{
            visibility: spriteState(rendering.subject.sprite, state).visible
              ? undefined
              : 'hidden',
          }}
        >
          <QuestionSprite
            rule={rendering.subject.sprite}
            state={state}
            className={styles.pixelPeekImage}
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
        <div className={styles.questionVisualSubject}>
          <PokemonRenderable
            policy={{ ...subjectPolicy, sprite: null }}
            state={state}
            name={question.subject.name}
            dexNumber={subjectDexNumber}
            types={question.subject.types}
            identityClassName={styles.questionVisualSubjectName}
            numberClassName={styles.questionVisualSubjectNumber}
            typesClassName={styles.questionVisualSubjectTypes}
          />
        </div>
      </>
    );
  }
  if (pixelSprite && question.subject.kind !== 'pokemon')
    return (
      <div className={styles.questionVisual}>
        {question.subject.kind === 'item' ? (
          <ItemRenderable
            className={styles.questionVisualSubject}
            name={
              question.optionLabels?.[question.subject.name] ??
              formatPokemonName(question.subject.name)
            }
            src={pixelSprite}
            policy={rendering.subject}
            state={state}
            spriteClassName={styles.questionVisualPokemon}
            nameClassName={styles.questionVisualSubjectName}
          />
        ) : (
          <QuestionSprite
            rule={rendering.subject.sprite}
            state={state}
            className={styles.questionVisualPokemon}
            src={pixelSprite}
          />
        )}
      </div>
    );
  return answerOnlyPortrait ||
    (question.subject.kind === 'pokemon' &&
      ((pixelSprite && subjectPolicy.sprite !== null) ||
        (question.subject.types?.length &&
          subjectPolicy.types !== 'never'))) ? (
    <div
      className={styles.questionVisual}
      aria-hidden={!answerOnlyPortrait || undefined}
    >
      <QuestionSubject {...subject} />
    </div>
  ) : null;
};
