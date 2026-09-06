import type { ReactNode } from 'react';
import { formatPokemonName, formatTypeMultiplier } from '@/game/format';
import type { QuestionData } from '@/game/types';
import { PokemonIdentity } from './PokemonIdentity';
import { Sprite } from './Sprite';
import { MysteryTypeBadge, TypeBadges } from './TypeBadge';

interface QuestionArtworkProps {
  answered: boolean;
  cluesShown: number;
  question: QuestionData;
}

const PixelSprite = ({ src }: { src: string }) => (
  <img
    className="pixel-sprite question-visual__pokemon"
    src={src}
    alt=""
    decoding="async"
    fetchPriority="high"
    width="96"
    height="96"
  />
);

const RelationArrow = ({
  direction = 'right',
}: {
  direction?: 'right' | 'up' | 'down';
}) => (
  <span
    className={`question-relation__arrow question-relation__arrow--${direction}`}
  >
    <svg aria-hidden="true" viewBox="0 0 54 32">
      <path d="M2 11h31V4l18 12-18 12v-7H2z" />
    </svg>
  </span>
);

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
    <span
      className={
        framed ? 'question-visual__pokemon-slot' : 'question-visual__portrait'
      }
    >
      {concealed ? (
        <span className="question-visual__question-mark">?</span>
      ) : src ? (
        <PixelSprite src={src} />
      ) : null}
    </span>
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
    question.prompt.kind === 'pokemon' ? question.prompt.dexNumber : undefined;
  const subject = {
    name: question.pokemonName,
    dexNumber: subjectDexNumber,
    src: pixelSprite,
  };

  if (
    (visual?.kind === 'type-check' || visual?.kind === 'type-twins') &&
    pixelSprite
  ) {
    return (
      <div className="question-visual" aria-hidden="true">
        <Subject {...subject}>
          {visual.kind === 'type-check' ? (
            <MysteryType answered={answered} types={question.pokemonTypes} />
          ) : (
            <SubjectTypes answered={answered} types={question.pokemonTypes} />
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
        <Subject
          name={visual.before}
          dexNumber={visual.stages[visual.before]?.dexNumber}
          src={visual.stages[visual.before]?.src}
          framed
        />
        <RelationArrow />
        <Subject
          name={question.pokemonName}
          dexNumber={visual.stages[question.pokemonName]?.dexNumber}
          src={visual.stages[question.pokemonName]?.src}
          concealed={!answered}
          framed
        />
        <RelationArrow />
        <Subject
          name={visual.after}
          dexNumber={visual.stages[visual.after]?.dexNumber}
          src={visual.stages[visual.after]?.src}
          framed
        />
      </div>
    );
  }

  if (visual?.kind === 'generation-roundup') {
    return (
      <div className="question-visual" aria-hidden="true">
        <strong className="question-generation">
          <span>Generation</span>
          <span>{visual.generation}</span>
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

  if (visual?.kind === 'evolution-shift' && pixelSprite) {
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
        <Subject {...evolution} concealed={!answered} framed>
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
    pixelSprite
  ) {
    const answer = question.answer.correctOptions[0];
    const answerVisual = answer ? question.optionVisuals?.[answer] : undefined;
    return (
      <div
        className="question-visual question-relation question-relation--matchup"
        aria-hidden="true"
      >
        {visual.kind === 'type-matchup' ? (
          <MysteryType answered={answered} types={answer ? [answer] : []} />
        ) : (
          <span className="question-visual__pokemon-slot">
            {answered && answerVisual ? (
              <PixelSprite src={answerVisual.src} />
            ) : (
              <span className="question-visual__question-mark">?</span>
            )}
          </span>
        )}
        <span className="question-relation__effect">
          <strong>×{formatTypeMultiplier(visual.multiplier)}</strong>
          <RelationArrow />
        </span>
        <Subject {...subject}>
          <SubjectTypes answered={answered} types={question.pokemonTypes} />
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
        <img
          className="pixel-sprite pixel-peek__image"
          src={media.src}
          alt={
            answered
              ? formatPokemonName(question.pokemonName)
              : 'Cropped Pokémon sprite'
          }
          decoding="async"
          fetchPriority="high"
          style={{ transformOrigin: `${media.focusX}% ${media.focusY}%` }}
          width="96"
          height="96"
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
