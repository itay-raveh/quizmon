import * as styles from './styles/classes.css.ts';
import { GenerationLabel } from '@/components/GenerationLabel';
import { formatPokemonName } from '@/domain/pokemon/format';
import type { QuestionData } from '@/domain/quiz/types';

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
      className={`${styles.clueBoard} ${visibleCount === 0 ? styles.clueBoardConcealed : ''}`}
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
