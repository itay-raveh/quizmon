import type { EffectKnowledge, EvolutionKnowledge } from '../topic-catalog.ts';
import type { QuestionData } from '../types.ts';
import { presentEffectQuestion } from './effect-presentation.ts';
import { presentEvolutionQuestion } from './evolution-presentation.ts';
import { presentMeasurementQuestion } from './measurement-presentation.ts';

export const presentQuestion = (
  question: QuestionData,
  {
    effects,
    evolutions,
  }: {
    effects?: readonly EffectKnowledge[];
    evolutions?: readonly EvolutionKnowledge[];
  },
): QuestionData =>
  presentEvolutionQuestion(
    presentMeasurementQuestion(presentEffectQuestion(question, effects)),
    evolutions,
  );
