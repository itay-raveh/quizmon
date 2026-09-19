import type { Difficulty } from '../difficulty.ts';
import type { VariantRules } from '../question-variants.ts';
import type {
  Generation,
  PokemonCatalog,
  PokemonKnowledge,
} from '../../pokemon/types.ts';
import type { QuestionHistory } from '../question-history.ts';
import type { QuestionData } from '../types.ts';

export interface Candidate {
  name: string;
  pokemon: PokemonKnowledge;
}

export interface QuestionContext {
  generations?: Generation[];
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

export type QuestionDraft = Omit<QuestionData, 'questionType'>;

export type QuestionBuilder = (
  context: QuestionContext,
) => QuestionDraft | undefined;
