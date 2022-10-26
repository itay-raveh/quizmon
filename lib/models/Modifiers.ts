import type { FormCategory } from 'lib/types/FormCategory';
import type { GenRoman } from 'lib/types/GenRoman';

export interface Modifiers {
  generations: GenRoman[];
  formCategories: FormCategory[];
  isLimitActive: boolean;
  limit: number;
}

export const modifiersInitialValues: Modifiers = {
  generations: ['I'],
  formCategories: ['default'],
  isLimitActive: true,
  limit: 10,
};
