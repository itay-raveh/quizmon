import { TypeBadges } from '@/components/TypeBadge';
import { GameButton } from '@/components/GameButton';
import { CheckIcon, MinusIcon, XIcon } from '@/components/icons';
import { formatPokemonName } from '@/domain/pokemon/format';
import type { PokemonCatalog } from '@/domain/pokemon/types';
import type { QuestionData } from '@/domain/quiz/types';
import { AnswerEffectiveness } from './AnswerEffectiveness';
import { answerOptionState } from './answer-option-state';
export const TypeAnswerPicker = ({
  question,
  selectedOptions,
  answered,
  onSelect,
  typeRelations,
}: {
  question: QuestionData;
  selectedOptions: readonly string[];
  answered: boolean;
  onSelect: (type: string) => void;
  typeRelations?: PokemonCatalog['typeRelations'];
}) => {
  const multiSelect = question.answer.interaction === 'multi-select';
  if (answered) {
    const visible = question.options.filter(
      (type) =>
        selectedOptions.includes(type) ||
        question.answer.correctOptions.includes(type),
    );
    return (
      <div
        className="type-picker__results"
        role="list"
        aria-label="Type answers"
      >
        {visible.map((type) => {
          const outcome = answerOptionState({
            answered: true,
            multiSelect,
            selected: selectedOptions.includes(type),
            correct: question.answer.correctOptions.includes(type),
          });
          const status =
            outcome === 'wrong'
              ? 'Wrong pick'
              : outcome === 'missed'
                ? 'Missed'
                : 'Correct';
          return (
            <div
              className={`type-picker__result type-picker__result--${outcome}`}
              role="listitem"
              key={type}
            >
              <TypeBadges types={[type]} label={formatPokemonName(type)} />
              <span className="visually-hidden">{status}</span>
              {outcome === 'missed' ? (
                <MinusIcon aria-hidden="true" weight="bold" />
              ) : outcome === 'correct' ? (
                <CheckIcon aria-hidden="true" weight="bold" />
              ) : (
                <XIcon aria-hidden="true" weight="bold" />
              )}
              {question.visual?.kind === 'typeMatchup' && typeRelations ? (
                <AnswerEffectiveness
                  option={type}
                  isTypeOption
                  attackTypes={[type]}
                  defenderTypes={question.subject.types ?? []}
                  typeRelations={typeRelations}
                />
              ) : null}
            </div>
          );
        })}
      </div>
    );
  }
  return (
    <div
      className="type-picker"
      role="group"
      aria-label={multiSelect ? 'Choose types' : 'Choose a type'}
    >
      {question.options.map((type) => {
        const selected = selectedOptions.includes(type);
        return (
          <GameButton
            key={type}
            className={`type-picker__option ${selected ? 'type-picker__option--selected' : ''}`.trim()}
            aria-label={formatPokemonName(type)}
            aria-pressed={multiSelect ? selected : undefined}
            onClick={() => onSelect(type)}
            sound="none"
          >
            <TypeBadges types={[type]} />
            {selected ? <CheckIcon aria-hidden="true" weight="bold" /> : null}
          </GameButton>
        );
      })}
    </div>
  );
};
