import * as styles from './styles/classes.css.ts';
import { getQuestionRendering } from '@/domain/quiz/variants';
import { getQuestionView } from '@/domain/quiz/presentation';
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
        styles.answers,
        view.answer.kind === 'text' && view.answer.detail === 'nature'
          ? styles.answersNature
          : '',
        (view.answer.kind === 'text' && view.answer.layout === 'statements') ||
        question.options.some(
          (option) => (question.optionLabels?.[option]?.length ?? 0) > 75,
        )
          ? styles.answersStatements
          : '',
        question.options.every((option) =>
          /^\d+$/.test(question.optionLabels?.[option] ?? ''),
        )
          ? styles.answersEvolutionLevels
          : '',
        question.options.every(
          (option) => question.optionDetails?.[option]?.length,
        )
          ? styles.answersEffectDetails
          : '',
        question.optionVisuals &&
        policy.sprite !== null &&
        Object.values(question.optionVisuals).some(({ src }) => src)
          ? styles.answersPokemon
          : '',
        view.answer.kind === 'pokemon' &&
        view.answer.layout === 'superEffectiveAttacker'
          ? styles.answersSuperEffectiveAttacker
          : '',
        hasTypeOptionBadges ? styles.answersTypeOptions : '',
        question.options.length > 4 && !multiSelect ? styles.answersMany : '',
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
          selected={selectedOptions.includes(option)}
          onSelect={onSelect}
          typeRelations={typeRelations}
        />
      ))}
    </div>
  );
};
