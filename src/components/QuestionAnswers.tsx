import { formatPokemonName } from '@/game/format';
import type { QuestionData } from '@/game/types';
import { GameButton } from './GameButton';

interface QuestionAnswersProps {
  answered: boolean;
  correctOptions: readonly string[];
  onSelect: (option: string) => void;
  question: QuestionData;
  selectedOptions: readonly string[];
}

export const QuestionAnswers = ({
  answered,
  correctOptions,
  onSelect,
  question,
  selectedOptions,
}: QuestionAnswersProps) => {
  const correct = new Set(correctOptions);
  const selected = new Set(selectedOptions);

  const optionClassName = (option: string) => {
    if (!answered) {
      return selected.has(option) ? 'answer answer--selected' : 'answer';
    }
    if (correct.has(option)) return 'answer answer--correct';
    if (selected.has(option)) return 'answer answer--wrong';
    return 'answer answer--muted';
  };

  return (
    <div
      className={`answers ${question.optionVisuals ? 'answers--pokemon' : ''}`.trim()}
    >
      {question.options.map((option, index) => {
        const visual = question.optionVisuals?.[option];
        const concealed = Boolean(question.concealOptionLabels && !answered);
        const optionSelected = selected.has(option);
        const selectionMark = answered
          ? correct.has(option)
            ? '✓'
            : optionSelected
              ? '×'
              : index + 1
          : question.answer.interaction === 'multi-select' && optionSelected
            ? '✓'
            : index + 1;

        return (
          <GameButton
            aria-label={
              concealed ? `Silhouette ${index + 1}` : formatPokemonName(option)
            }
            aria-keyshortcuts={String(index + 1)}
            aria-pressed={
              question.answer.interaction === 'single-choice'
                ? undefined
                : optionSelected
            }
            className={`${optionClassName(option)} ${visual ? 'answer--pokemon' : ''}`.trim()}
            clickSound="none"
            disabled={answered}
            key={option}
            onClick={() => onSelect(option)}
          >
            <kbd aria-hidden="true">{selectionMark}</kbd>
            {visual ? (
              <>
                <span className="answer__sprite-field" aria-hidden="true">
                  <img
                    className={`pixel-sprite answer__sprite ${visual.silhouette && !answered ? 'answer__sprite--silhouette' : ''}`.trim()}
                    src={visual.src}
                    alt=""
                    decoding="async"
                    width="96"
                    height="96"
                  />
                </span>
                <span className="answer__nameplate">
                  {concealed ? (
                    <span>Silhouette {index + 1}</span>
                  ) : (
                    <>
                      <small aria-hidden="true">
                        No. {String(visual.dexNumber).padStart(4, '0')}
                      </small>
                      <span>{formatPokemonName(option)}</span>
                    </>
                  )}
                </span>
              </>
            ) : (
              <span>{formatPokemonName(option)}</span>
            )}
          </GameButton>
        );
      })}
    </div>
  );
};
