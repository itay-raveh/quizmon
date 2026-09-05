import { formatPokemonName, formatPokemonTypes } from '@/game/format';
import type { QuestionData } from '@/game/types';
import { GameButton } from './GameButton';
import { TypeBadges } from './TypeBadge';

const typeOptionQuestionTypes = new Set<QuestionData['questionType']>([
  'evolution-shift',
  'type-check',
  'type-matchup',
]);

const optionTypeRevealQuestionTypes = new Set<QuestionData['questionType']>([
  'counter-pick',
  'odd-one-out',
  'type-roundup',
]);

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
  const hasTypeOptionBadges = typeOptionQuestionTypes.has(
    question.questionType,
  );
  const revealsOptionTypes =
    answered && optionTypeRevealQuestionTypes.has(question.questionType);

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
      className={[
        'answers',
        question.optionVisuals ? 'answers--pokemon' : '',
        hasTypeOptionBadges ? 'answers--type-options' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {question.options.map((option, index) => {
        const visual = question.optionVisuals?.[option];
        const concealed = Boolean(question.concealOptionLabels && !answered);
        const optionSelected = selected.has(option);
        const typeAnnouncement =
          revealsOptionTypes && visual
            ? `. ${visual.types.length === 1 ? 'Type' : 'Types'}: ${formatPokemonTypes(visual.types)}.`
            : '';
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
              concealed
                ? `Silhouette ${index + 1}`
                : `${formatPokemonName(option)}${typeAnnouncement}`
            }
            aria-keyshortcuts={String(index + 1)}
            aria-pressed={
              question.answer.interaction === 'single-choice'
                ? undefined
                : optionSelected
            }
            className={`${optionClassName(option)} ${visual ? 'answer--pokemon' : ''} ${concealed ? 'answer--concealed' : ''}`.trim()}
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
                {concealed ? null : (
                  <span className="answer__nameplate">
                    <small aria-hidden="true">
                      No. {String(visual.dexNumber).padStart(4, '0')}
                    </small>
                    <span className="answer__name">
                      {formatPokemonName(option)}
                    </span>
                    {revealsOptionTypes ? (
                      <TypeBadges
                        className="answer__types"
                        types={visual.types}
                      />
                    ) : null}
                  </span>
                )}
              </>
            ) : hasTypeOptionBadges ? (
              <TypeBadges className="answer__type-choice" types={[option]} />
            ) : (
              <span>{formatPokemonName(option)}</span>
            )}
          </GameButton>
        );
      })}
    </div>
  );
};
