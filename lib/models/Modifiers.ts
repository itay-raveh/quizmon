import type { FormCategory } from 'lib/types/FormCategory';
import type { GenRoman } from 'lib/types/GenRoman';

export interface Modifiers {
  generations: GenRoman[];
  isLimitActive: boolean;
  limit: number;
  formCategories: FormCategory[];
}

export const modifiersInitialValues: Modifiers = {
  generations: ['I'],
  isLimitActive: true,
  limit: 10,
  formCategories: ['default'],
};
