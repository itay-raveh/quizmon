import type { Difficulty } from '../difficulty';
import type { VariantRules } from '../question-variants';
import type { PokemonCatalog, PokemonKnowledge } from '../../pokemon/types';
import type { QuestionHistory } from '../question-history';
import type { QuestionData } from '../types';

export interface Candidate {
  name: string;
  pokemon: PokemonKnowledge;
}

export interface QuestionContext {
  difficulty?: Difficulty;
  variant?: VariantRules;
  catalog: PokemonCatalog;
  pool: Candidate[];
  random: () => number;
  used: Set<string>;
  history?: QuestionHistory;
  questionType?: QuestionData['questionType'];
  rotation?: number;
}

export type QuestionDraft = Omit<QuestionData, 'generation' | 'questionType'>;

export type QuestionBuilder = (
  context: QuestionContext,
) => QuestionDraft | undefined;
