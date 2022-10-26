import type { FormCategory } from 'lib/types/FormCategory';
import type { GenRoman } from 'lib/types/GenRoman';

export interface Modifiers {
  generations: GenRoman[];
  formCategories: FormCategory[];
  isLimitActive: boolean;
  limit: number;
}
