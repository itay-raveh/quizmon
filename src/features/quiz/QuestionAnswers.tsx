import { getQuestionRendering } from '@/domain/quiz/question-variants';
import { QuestionAnswerChoice } from './QuestionAnswerChoice';
import type { PokemonCatalog } from '@/domain/pokemon/types';
import type { QuestionData } from '@/domain/quiz/types';
import { TypeAnswerPicker } from './TypeAnswerPicker';
import { orderRegionOptions } from './region-option-order';
const typeOptionQuestionTypes = new Set<QuestionData['questionType']>([
  'move-types',
  'natural-gift',
  'evolution-shift',
  'type-check',
  'type-matchup',
]);
const optionTypeRevealQuestionTypes = new Set<QuestionData['questionType']>([
  'counter-pick',
  'odd-one-out',
  'type-roundup',
  'type-twins',
]);
interface QuestionAnswersProps {
  typeRelations?: PokemonCatalog['typeRelations'];
  answered: boolean;
  cluesShown?: number;
  onSelect: (option: string) => void;
  question: QuestionData;
  selectedOptions: readonly string[];
}
export const QuestionAnswers = ({
  typeRelations,
  cluesShown = 0,
  answered,
  onSelect,
  question,
  selectedOptions,
}: QuestionAnswersProps) => {
  const hasTypeOptionBadges = typeOptionQuestionTypes.has(
    question.questionType,
  );
  const reservesOptionTypes = optionTypeRevealQuestionTypes.has(
    question.questionType,
  );
  const multiSelect = question.answer.interaction === 'multi-select';
  const policy = getQuestionRendering(question).choices;
  if (hasTypeOptionBadges && question.options.length > 4) {
    return (
      <TypeAnswerPicker
        question={question}
        selectedOptions={selectedOptions}
        answered={answered}
        onSelect={onSelect}
        typeRelations={typeRelations}
      />
    );
  }
  const options = orderRegionOptions(question);
  return (
    <div
      className={[
        'answers',
        question.questionType === 'nature-effects' ? 'answers--nature' : '',
        question.questionType === 'held-item-effects' ||
        question.questionType === 'ability-effects' ||
        question.options.some(
          (option) => (question.optionLabels?.[option]?.length ?? 0) > 75,
        )
          ? 'answers--statements'
          : '',
        question.questionType === 'evolution-conditions' &&
        question.options.every((option) =>
          /^\d+$/.test(question.optionLabels?.[option] ?? ''),
        )
          ? 'answers--evolution-levels'
          : '',
        question.options.every(
          (option) => question.optionDetails?.[option]?.length,
        )
          ? 'answers--effect-details'
          : '',
        question.optionVisuals && policy.sprite !== 'never'
          ? 'answers--pokemon'
          : '',
        question.questionType === 'counter-pick' ? 'answers--counter-pick' : '',
        hasTypeOptionBadges ? 'answers--type-options' : '',
        question.options.length > 4 && !multiSelect ? 'answers--many' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {options.map((option, index) => (
        <QuestionAnswerChoice
          key={option}
          question={question}
          option={option}
          index={index}
          answered={answered}
          cluesShown={cluesShown}
          selectedOptions={selectedOptions}
          onSelect={onSelect}
          typeRelations={typeRelations}
          hasTypeOptionBadges={hasTypeOptionBadges}
          reservesOptionTypes={reservesOptionTypes}
        />
      ))}
    </div>
  );
};
