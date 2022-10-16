import { GenRoman } from 'lib/types/GenRoman';

export interface Modifiers {
  generations: GenRoman[];
}

export const modifiersInitialValues: Modifiers = {
  generations: ['I'],
};
