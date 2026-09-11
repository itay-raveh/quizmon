import type { QuestionData, QuestionRepetition } from '../types';

type RepeatSource = Pick<QuestionData, 'pokemonName' | 'options' | 'answer'>;

type RepeatRule = (question: RepeatSource) => QuestionRepetition;

export const targetRepetition =
  ({
    pokemonOptions,
    related = [],
    variant = [],
  }: {
    pokemonOptions: boolean;
    related?: string[];
    variant?: string[];
  }): RepeatRule =>
  (question) => {
    const primary = [
      ...new Set([
        question.pokemonName,
        ...related,
        ...(pokemonOptions ? question.answer.correctOptions : []),
      ]),
    ];
    return {
      identity: [question.pokemonName, ...variant].join(':'),
      subjects: [question.pokemonName],
      primary,
      distractors: pokemonOptions
        ? question.options.filter((name) => !primary.includes(name))
        : [],
    };
  };

export const optionSetRepetition =
  ({
    subjects,
    variant = [],
  }: {
    subjects: 'all' | 'correct';
    variant?: string[];
  }): RepeatRule =>
  (question) => {
    const primary =
      subjects === 'all' ? question.options : question.answer.correctOptions;
    return {
      identity: [...variant, [...question.options].sort().join(',')].join(':'),
      subjects: [...primary],
      primary: [...primary],
      distractors: question.options.filter((name) => !primary.includes(name)),
    };
  };
