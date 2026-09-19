import type { EffectKnowledge, EvolutionKnowledge } from '../topic-catalog';
import type { QuestionData } from '../types';
import { presentEffectQuestion } from './effect-presentation';
import { presentEvolutionQuestion } from './evolution-presentation';
import { presentMeasurementQuestion } from './measurement-presentation';

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
