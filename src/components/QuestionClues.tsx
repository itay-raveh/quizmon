import { formatPokemonName } from '@/game/format';
import { GenerationLabel } from './GenerationLabel';
import type { QuestionData } from '@/game/types';

export const QuestionClues = ({
  cluesShown,
  question,
}: {
  cluesShown: number;
  question: QuestionData;
}) => {
  if (!question.clues) return null;
  const visibleCount = Math.max(0, cluesShown - 1);
  return (
    <div
      className={`clue-board ${visibleCount === 0 ? 'clue-board--concealed' : ''}`}
    >
      <ol aria-live="polite">
        {question.clues.map((clue, index) => (
          <li
            key={typeof clue === 'string' ? clue : clue.kind}
            aria-hidden={index >= visibleCount}
            style={{ visibility: index >= visibleCount ? 'hidden' : undefined }}
          >
            {typeof clue === 'string' ? (
              clue
            ) : (
              <>
                {clue.types.map(formatPokemonName).join(' / ')} type, introduced
                in{' '}
                <GenerationLabel
                  abbreviated={false}
                  generation={clue.generation}
                />
                .
              </>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
};
