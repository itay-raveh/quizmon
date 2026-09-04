import { getAnswerPoints } from '@/game/game';
import type { QuestionData } from '@/game/types';
import { GameButton } from './GameButton';

interface QuestionCluesProps {
  answered: boolean;
  cluesShown: number;
  onReveal: () => void;
  question: QuestionData;
}

export const QuestionClues = ({
  answered,
  cluesShown,
  onReveal,
  question,
}: QuestionCluesProps) => {
  const clues = question.clues;
  const visibleCount = Math.max(0, cluesShown - 1);
  if (!clues || (visibleCount === 0 && answered)) return null;

  return (
    <div
      className={`clue-board ${visibleCount === 0 ? 'clue-board--action-only' : ''}`.trim()}
    >
      {visibleCount > 0 ? (
        <ol aria-live="polite">
          {clues.slice(0, visibleCount).map((clue) => (
            <li key={clue}>{clue}</li>
          ))}
        </ol>
      ) : null}
      {cluesShown <= clues.length && !answered ? (
        <GameButton className="clue-button" tone="quiet" onClick={onReveal}>
          {cluesShown === 0 ? 'Show 4 choices' : 'Reveal another clue'} ·{' '}
          {getAnswerPoints(question, true, cluesShown + 1)} points
        </GameButton>
      ) : null}
    </div>
  );
};
