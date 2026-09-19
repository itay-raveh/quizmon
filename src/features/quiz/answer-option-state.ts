export type AnswerOptionState =
  'idle' | 'selected' | 'correct' | 'missed' | 'wrong' | 'muted';

export const answerOptionState = ({
  answered,
  multiSelect,
  selected,
  correct,
}: {
  answered: boolean;
  multiSelect: boolean;
  selected: boolean;
  correct: boolean;
}): AnswerOptionState => {
  if (!answered) return selected ? 'selected' : 'idle';
  if (correct) return multiSelect && !selected ? 'missed' : 'correct';
  return selected ? 'wrong' : 'muted';
};
