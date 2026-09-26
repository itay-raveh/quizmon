import { getQuestionRendering } from '@/domain/quiz/question-variants';
import { getQuestionView } from '@/domain/quiz/question-presentation';
import { QuestionAnswerChoice } from './QuestionAnswerChoice';
import type { PokemonCatalog } from '@/domain/pokemon/types';
import type { QuestionData } from '@/domain/quiz/types';
import { TypeAnswerPicker } from './TypeAnswerPicker';
import { orderRegionOptions } from './region-option-order';
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
  const view = getQuestionView(question);
  const hasTypeOptionBadges = view.answer.kind === 'type';
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
        view.answer.kind === 'text' && view.answer.detail === 'nature'
          ? 'answers--nature'
          : '',
        (view.answer.kind === 'text' && view.answer.layout === 'statements') ||
        question.options.some(
          (option) => (question.optionLabels?.[option]?.length ?? 0) > 75,
        )
          ? 'answers--statements'
          : '',
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
        view.answer.kind === 'pokemon' && view.answer.layout === 'counter-pick'
          ? 'answers--counter-pick'
          : '',
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
        />
      ))}
    </div>
  );
};
