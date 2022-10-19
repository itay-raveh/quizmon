import { GenRoman } from 'lib/types/GenRoman';

export interface Modifiers {
  generations: GenRoman[];
  isLimitActive: boolean;
  limit: number;
}

export const modifiersInitialValues: Modifiers = {
  generations: ['I'],
  isLimitActive: true,
  limit: 10,
};
