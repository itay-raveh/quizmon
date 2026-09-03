import { formatPokemonName } from '@/game/format';
import type { QuestionData } from '@/game/types';
import { Sprite } from './Sprite';

interface QuestionArtworkProps {
  answered: boolean;
  cluesShown: number;
  question: QuestionData;
}

export const QuestionArtwork = ({
  answered,
  cluesShown,
  question,
}: QuestionArtworkProps) => {
  const { media } = question;

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
      <img
        className="pixel-sprite"
        src={media.src}
        alt=""
        decoding="async"
        fetchPriority="high"
        width="96"
        height="96"
      />
    </div>
  ) : null;
};
