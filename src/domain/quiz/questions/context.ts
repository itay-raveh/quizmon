import type { Level } from '../level.ts';
import type {
  Generation,
  PokemonCatalog,
  PokemonKnowledge,
} from '../../pokemon/types.ts';
import type { QuestionHistory } from '../history.ts';
import type { QuestionData } from '../types.ts';

export interface Candidate {
  name: string;
  pokemon: PokemonKnowledge;
}

export interface QuestionContext<Rules extends object = object> {
  generations?: Generation[];
  level?: Level;
  variant?: Rules;
  catalog: PokemonCatalog;
  pool: Candidate[];
  random: () => number;
  used: Set<string>;
  history?: QuestionHistory;
  questionType?: QuestionData['questionType'];
  rotation?: number;
}

export type QuestionDraft = Omit<QuestionData, 'questionType'>;

export type QuestionBuilder<Rules extends object = object> = (
  context: QuestionContext<Rules> & { variant: Rules },
) => QuestionDraft | undefined;
