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
  return (
    <div
      className="type-picker"
      role="group"
      aria-label={multiSelect ? 'Choose types' : 'Choose a type'}
    >
      {question.options.map((type) => {
        const selected = selectedOptions.includes(type);
        const correct = question.answer.correctOptions.includes(type);
        const outcome = answerOptionState({
          answered,
          multiSelect,
          selected,
          correct,
        });
        const resultAnnouncement =
          outcome === 'missed'
            ? '. Correct answer, not selected'
            : outcome === 'wrong'
              ? '. Wrong pick'
              : outcome === 'correct'
                ? '. Correct'
                : '';
        return (
          <div className="type-picker__choice" key={type}>
            <GameButton
              className={`type-picker__option ${outcome === 'idle' ? '' : `answer--${outcome}`}`.trim()}
              aria-label={`${formatPokemonName(type)}${resultAnnouncement}`}
              aria-pressed={multiSelect ? selected : undefined}
              disabled={answered}
              onClick={() => onSelect(type)}
              sound="none"
            >
              <TypeBadges types={[type]} />
              {outcome === 'missed' ? (
                <MinusIcon
                  className="type-picker__mark"
                  aria-hidden="true"
                  weight="bold"
                />
              ) : outcome === 'wrong' ? (
                <XIcon
                  className="type-picker__mark"
                  aria-hidden="true"
                  weight="bold"
                />
              ) : outcome === 'correct' || outcome === 'selected' ? (
                <CheckIcon
                  className="type-picker__mark"
                  aria-hidden="true"
                  weight="bold"
                />
              ) : null}
            </GameButton>
            {answered &&
            (selected || correct) &&
            question.visual?.kind === 'typeMatchup' &&
            typeRelations ? (
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
};
