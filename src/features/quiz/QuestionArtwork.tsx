import { GenerationLabel } from '@/components/GenerationLabel';
import { PixelSprite } from '@/components/PixelSprite';
import { PokemonIdentity } from '@/components/PokemonIdentity';
import { RelationArrow, TypeEffectArrow } from '@/components/RelationArrow';
import { Sprite } from '@/components/Sprite';
import { MysteryTypeBadge, TypeBadges } from '@/components/TypeBadge';
import { formatPokemonName, formatPokemonTypes } from '@/domain/pokemon/format';
import type { QuestionData } from '@/domain/quiz/types';
import { Fragment, type CSSProperties, type ReactNode } from 'react';

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

const SubjectTypes = ({
  answered,
  types,
}: {
  answered: boolean;
  types: readonly string[];
}) => (
  <span style={{ visibility: answered ? undefined : 'hidden' }}>
    <TypeBadges className="question-visual__subject-types" types={types} />
  </span>
);

const Subject = ({
  name,
  dexNumber,
  src,
  concealed = false,
  framed = false,
  children,
}: {
  name: string;
  dexNumber?: number;
  src?: string;
  concealed?: boolean;
  framed?: boolean;
  children?: ReactNode;
}) => (
  <div className="question-visual__subject">
    {src || concealed ? (
      <span
        className={
          framed ? 'question-visual__pokemon-slot' : 'question-visual__portrait'
        }
      >
        {concealed ? (
          <span className="question-visual__question-mark">?</span>
        ) : src ? (
          <PixelSprite className="question-visual__pokemon" src={src} />
        ) : null}
      </span>
    ) : null}
    <PokemonIdentity
      className="question-visual__subject-name"
      name={name}
      dexNumber={dexNumber}
      numberClassName="question-visual__subject-number"
      revealed={!concealed}
    />
    {children}
  </div>
);

export const QuestionArtwork = ({
  answered,
  cluesShown,
  question,
}: QuestionArtworkProps) => {
  const { media, visual } = question;
  const pixelSprite = media.kind === 'pixel-sprite' ? media.src : undefined;
  const subjectDexNumber =
    question.prompt.kind === 'pokemon' && !question.namesOnly
      ? question.prompt.dexNumber
      : undefined;
  const subject = {
    name: question.pokemonName,
    dexNumber: subjectDexNumber,
    src: pixelSprite,
  };

  if (
    (visual?.kind === 'type-check' || visual?.kind === 'type-twins') &&
    (pixelSprite || question.namesOnly)
  ) {
    return (
      <div className="question-visual" aria-hidden="true">
        <Subject {...subject}>
          {visual.kind === 'type-check' ? (
            <MysteryType answered={answered} types={question.pokemonTypes} />
          ) : (
            <SubjectTypes
              answered={answered || Boolean(question.showTypes)}
              types={question.pokemonTypes}
            />
          )}
        </Subject>
      </div>
    );
  }

  if (visual?.kind === 'evolution-link') {
    return (
      <div
        className="question-visual question-evolution-link"
        aria-hidden="true"
      >
        {[visual.before, question.pokemonName, visual.after].map(
          (name, index) => (
            <Fragment key={index}>
              {index > 0 && <RelationArrow />}
              <Subject
                name={name}
                dexNumber={visual.stages[name]?.dexNumber}
                src={visual.stages[name]?.src}
                concealed={index === 1 && !answered}
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

  if (visual?.kind === 'stat-showdown') {
    return (
      <div className="question-visual" aria-hidden="true">
        <div className="question-visual__stat">
          <strong>{formatPokemonName(visual.stat)}</strong>
          <RelationArrow
            direction={visual.direction === 'highest' ? 'up' : 'down'}
          />
        </div>
      </div>
    );
  }

  if (
    visual?.kind === 'evolution-shift' &&
    (pixelSprite || question.namesOnly)
  ) {
    const { evolution, gainedType } = visual;
    const retainedTypes = evolution.types.filter((type) => type !== gainedType);
    return (
      <div
        className="question-visual question-relation question-relation--evolution"
        aria-hidden="true"
      >
        <Subject {...subject} framed>
          <TypeBadges types={question.pokemonTypes} />
        </Subject>
        <div className="question-relation__effect">
          <RelationArrow />
          <span className="question-relation__caption">evolves into</span>
        </div>
        <Subject
          {...evolution}
          dexNumber={question.namesOnly ? undefined : evolution.dexNumber}
          src={question.namesOnly ? undefined : evolution.src}
          concealed={!answered}
          framed
        >
          <span className="question-visual__evolution-types">
            {retainedTypes.length > 0 ? (
              <>
                <TypeBadges types={retainedTypes} />
                <span className="question-visual__type-plus">+</span>
              </>
            ) : null}
            <MysteryType answered={answered} types={[gainedType]} />
          </span>
        </Subject>
      </div>
    );
  }

  if (
    (visual?.kind === 'type-matchup' || visual?.kind === 'counter-pick') &&
    (pixelSprite || question.namesOnly)
  ) {
    const answer = question.answer.correctOptions[0];
    const answerVisual = answer ? question.optionVisuals?.[answer] : undefined;
    return (
      <div
        className="question-visual question-relation question-relation--matchup"
        role="img"
        aria-hidden={!(answered || question.showTypes) || undefined}
        aria-label={`${formatPokemonName(question.pokemonName)} ${question.pokemonTypes.length === 1 ? 'type' : 'types'}: ${formatPokemonTypes(question.pokemonTypes)}.`}
      >
        {visual.kind === 'type-matchup' ? (
          <MysteryType answered={answered} types={answer ? [answer] : []} />
        ) : (
          <span className="question-visual__pokemon-slot">
            {answered && answerVisual ? (
              <PixelSprite
                className="question-visual__pokemon"
                src={answerVisual.src}
              />
            ) : (
              <span className="question-visual__question-mark">?</span>
            )}
          </span>
        )}
        <TypeEffectArrow multiplier={visual.multiplier} />
        <Subject {...subject}>
          <SubjectTypes
            answered={answered || Boolean(question.showTypes)}
            types={question.pokemonTypes}
          />
        </Subject>
      </div>
    );
  }

  if (media.kind === 'sprite') {
    const visible =
      answered || media.revealAt === undefined || cluesShown >= media.revealAt;
    return (
      <div
        className="question__artwork"
        aria-hidden={!visible || undefined}
        style={{ visibility: visible ? undefined : 'hidden' }}
      >
        <Sprite silhouette={media.silhouette && !answered} src={media.src} />
      </div>
    );
  }

  if (media.kind === 'pixel-peek') {
    return (
      <div className={`pixel-peek ${answered ? 'pixel-peek--revealed' : ''}`}>
        <PixelSprite
          className="pixel-peek__image"
          src={media.src}
          alt={
            answered
              ? formatPokemonName(question.pokemonName)
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
    );
  }

  return pixelSprite ? (
    <div className="question-visual" aria-hidden="true">
      <Subject {...subject} />
    </div>
  ) : null;
};
