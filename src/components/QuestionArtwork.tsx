import {
  formatPokedexNumber,
  formatPokemonName,
  formatTypeMultiplier,
} from '@/game/format';
import type { QuestionData } from '@/game/types';
import { ArrowDownIcon, ArrowUpIcon } from './icons';
import { PokemonIdentity } from './PokemonIdentity';
import { Sprite } from './Sprite';
import { MysteryTypeBadge, TypeBadges } from './TypeBadge';

interface QuestionArtworkProps {
  answered: boolean;
  cluesShown: number;
  question: QuestionData;
}

const PixelSprite = ({
  className = '',
  src,
}: {
  className?: string;
  src: string;
}) => (
  <img
    className={`pixel-sprite ${className}`.trim()}
    src={src}
    alt=""
    decoding="async"
    fetchPriority="high"
    width="96"
    height="96"
  />
);

const RelationArrow = () => (
  <span className="question-relation__arrow">
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
  <span
    className={`question-visual__mystery-type ${answered ? 'question-visual__mystery-type--answered' : ''}`.trim()}
  >
    {answered ? (
      <TypeBadges className="question-visual__type-answer" types={types} />
    ) : (
      <MysteryTypeBadge />
    )}
  </span>
);

const SubjectTypes = ({
  answered,
  types,
}: {
  answered: boolean;
  types: readonly string[];
}) =>
  answered ? (
    <TypeBadges className="question-visual__subject-types" types={types} />
  ) : (
    <span className="question-visual__type-space" />
  );

export const QuestionArtwork = ({
  answered,
  cluesShown,
  question,
}: QuestionArtworkProps) => {
  const { media } = question;
  const pixelSprite = media.kind === 'pixel-sprite' ? media.src : null;
  const subjectDexNumber =
    question.prompt.kind === 'pokemon' ? question.prompt.dexNumber : undefined;

  if (question.visual?.kind === 'type-check' && pixelSprite) {
    return (
      <div
        className="question-visual question-visual--stack"
        aria-hidden="true"
      >
        <p className="question-visual__prompt">
          Which type does{' '}
          <strong>
            {formatPokemonName(question.pokemonName)}{' '}
            {subjectDexNumber === undefined ? null : (
              <small className="question__subject-number">
                ({formatPokedexNumber(subjectDexNumber)})
              </small>
            )}
          </strong>{' '}
          have?
        </p>
        <div className="question-visual__subject">
          <PixelSprite className="question-visual__pokemon" src={pixelSprite} />
          <MysteryType answered={answered} types={question.pokemonTypes} />
        </div>
      </div>
    );
  }

  if (question.visual?.kind === 'type-twins' && pixelSprite) {
    return (
      <div
        className="question-visual question-visual--stack"
        aria-hidden="true"
      >
        <p className="question-visual__prompt">
          Which Pokémon has the same two types as{' '}
          <strong>{formatPokemonName(question.pokemonName)}</strong>?
        </p>
        <div className="question-visual__subject">
          <PixelSprite className="question-visual__pokemon" src={pixelSprite} />
          <SubjectTypes answered={answered} types={question.pokemonTypes} />
        </div>
      </div>
    );
  }

  if (question.visual?.kind === 'evolution-link') {
    return (
      <div className="question-visual question-visual--stack">
        <p className="question-visual__prompt">Complete the evolution chain</p>
        <p className="question-evolution-link">
          <span>{formatPokemonName(question.visual.before)}</span>
          <span aria-hidden="true">→</span>
          <strong>
            {answered ? formatPokemonName(question.pokemonName) : '?'}
          </strong>
          <span aria-hidden="true">→</span>
          <span>{formatPokemonName(question.visual.after)}</span>
        </p>
      </div>
    );
  }

  if (question.visual?.kind === 'type-roundup') {
    return (
      <div
        className="question-visual question-visual--stack"
        aria-hidden="true"
      >
        <p className="question-visual__prompt question-visual__prompt--roundup">
          <span>Select every</span>
          <TypeBadges
            className="question-visual__roundup-type"
            types={[question.visual.type]}
          />
          <span>Pokémon</span>
        </p>
      </div>
    );
  }

  if (question.visual?.kind === 'stat-showdown') {
    const { direction, stat } = question.visual;
    return (
      <div
        className="question-visual question-visual--stack"
        aria-hidden="true"
      >
        <p className="question-visual__prompt">
          Which one has the <strong>{direction}</strong>:
        </p>
        <div className="question-visual__stat">
          <strong>{formatPokemonName(stat)}</strong>
          <span>
            {direction === 'highest' ? (
              <ArrowUpIcon weight="bold" />
            ) : (
              <ArrowDownIcon weight="bold" />
            )}
          </span>
        </div>
      </div>
    );
  }

  if (question.visual?.kind === 'evolution-shift' && pixelSprite) {
    const { evolution, gainedType } = question.visual;
    const retainedTypes = evolution.types.filter((type) => type !== gainedType);
    return (
      <div
        className="question-visual question-relation question-relation--evolution"
        aria-hidden="true"
      >
        <div className="question-visual__subject">
          <span className="question-visual__pokemon-slot">
            <PixelSprite src={pixelSprite} />
          </span>
          <PokemonIdentity
            className="question-visual__subject-name"
            dexNumber={subjectDexNumber}
            name={question.pokemonName}
            numberClassName="question-visual__subject-number"
          />
          <TypeBadges types={question.pokemonTypes} />
        </div>
        <RelationArrow />
        <div className="question-visual__subject">
          <span className="question-visual__pokemon-slot question-visual__unknown-pokemon">
            {answered ? (
              <PixelSprite src={evolution.src} />
            ) : (
              <span className="question-visual__question-mark">?</span>
            )}
          </span>
          <PokemonIdentity
            className="question-visual__subject-name"
            dexNumber={evolution.dexNumber}
            name={evolution.name}
            numberClassName="question-visual__subject-number"
            revealed={answered}
          />
          <span className="question-visual__evolution-types">
            {retainedTypes.length > 0 ? (
              <TypeBadges types={retainedTypes} />
            ) : null}
            {retainedTypes.length > 0 ? (
              <span className="question-visual__type-plus">+</span>
            ) : null}
            <MysteryType answered={answered} types={[gainedType]} />
          </span>
        </div>
      </div>
    );
  }

  if (question.visual?.kind === 'type-matchup' && pixelSprite) {
    const answerType = question.answer.correctOptions[0];
    return (
      <div
        className="question-visual question-relation question-relation--matchup"
        aria-hidden="true"
      >
        <MysteryType
          answered={answered}
          types={answerType ? [answerType] : []}
        />
        <span className="question-relation__effect">
          <strong>×{formatTypeMultiplier(question.visual.multiplier)}</strong>
          <RelationArrow />
        </span>
        <div className="question-visual__subject">
          <PixelSprite className="question-visual__pokemon" src={pixelSprite} />
          <PokemonIdentity
            className="question-visual__subject-name"
            dexNumber={subjectDexNumber}
            name={question.pokemonName}
            numberClassName="question-visual__subject-number"
          />
          <SubjectTypes answered={answered} types={question.pokemonTypes} />
        </div>
      </div>
    );
  }

  if (question.visual?.kind === 'counter-pick' && pixelSprite) {
    const answer = question.answer.correctOptions[0];
    const answerVisual = answer ? question.optionVisuals?.[answer] : undefined;
    return (
      <div
        className="question-visual question-relation question-relation--matchup"
        aria-hidden="true"
      >
        <span className="question-visual__pokemon-slot question-visual__unknown-pokemon">
          {answered && answerVisual ? (
            <PixelSprite src={answerVisual.src} />
          ) : (
            <span className="question-visual__question-mark">?</span>
          )}
        </span>
        <span className="question-relation__effect">
          <strong>×{formatTypeMultiplier(question.visual.multiplier)}</strong>
          <RelationArrow />
        </span>
        <div className="question-visual__subject">
          <PixelSprite className="question-visual__pokemon" src={pixelSprite} />
          <PokemonIdentity
            className="question-visual__subject-name"
            dexNumber={subjectDexNumber}
            name={question.pokemonName}
            numberClassName="question-visual__subject-number"
          />
          <SubjectTypes answered={answered} types={question.pokemonTypes} />
        </div>
      </div>
    );
  }

  if (media.kind === 'sprite') {
    const visible =
      answered || media.revealAt === undefined || cluesShown >= media.revealAt;
    return visible ? (
      <Sprite silhouette={media.silhouette && !answered} src={media.src} />
    ) : null;
  }

  if (media.kind === 'pixel-peek') {
    return (
      <div
        className={`pixel-peek ${answered ? 'pixel-peek--revealed' : ''}`.trim()}
      >
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

  return media.kind === 'pixel-sprite' ? (
    <div className="question__portrait" aria-hidden="true">
      <PixelSprite src={media.src} />
    </div>
  ) : null;
};
