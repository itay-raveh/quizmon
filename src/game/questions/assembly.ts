import type {
  PokemonKnowledge,
  PokemonOptionVisual,
  QuestionCategory,
  QuestionPrompt,
  QuestionRepetition,
  StatName,
} from '../types';
import type { Candidate, QuestionContext, QuestionDraft } from './context';

export const getOptionVisuals = (
  context: QuestionContext,
  options: readonly string[],
  getSource: (pokemon: PokemonKnowledge, option: string) => string | null = (
    pokemon,
  ) => pokemon.sprite,
  silhouette = false,
): Record<string, PokemonOptionVisual> =>
  Object.fromEntries(
    options.flatMap((option) => {
      const pokemon = context.catalog.pokemon[option];
      if (!pokemon) return [];
      const src = getSource(pokemon, option);
      if (!src) return [];
      return [
        [
          option,
          {
            dexNumber: pokemon.speciesId,
            silhouette,
            src,
            types: pokemon.types,
          },
        ] as const,
      ];
    }),
  );

const getOptionDexNumbers = (
  context: QuestionContext,
  options: readonly string[],
): Record<string, number> =>
  Object.fromEntries(
    options.flatMap((option) => {
      const pokemon = context.catalog.pokemon[option];
      return pokemon ? [[option, pokemon.speciesId] as const] : [];
    }),
  );

export type AnswerPresentation =
  | { kind: 'text' }
  | { kind: 'pokemon-names'; numbers?: boolean }
  | {
      kind: 'pokemon-sprites';
      numbers?: boolean;
      labels?: 'concealed';
      silhouette?: boolean;
      source?: (pokemon: PokemonKnowledge, option: string) => string | null;
    };

type AnswerDetails =
  | { kind: 'classification' }
  | { kind: 'generation' }
  | { kind: 'stat'; stat: StatName };

export interface QuestionAssembly {
  repeat: (question: Omit<QuestionDraft, 'repetition'>) => QuestionRepetition;
  category: QuestionCategory;
  target: Candidate;
  correct: string | string[];
  options: string[];
  prompt: QuestionPrompt;
  media?: QuestionDraft['media'];
  presentation: AnswerPresentation;
  details?: AnswerDetails;
}

export const targetMedia = (target: Candidate): QuestionDraft['media'] =>
  target.pokemon.sprite
    ? { kind: 'pixel-sprite', src: target.pokemon.sprite }
    : { kind: 'none' };

export const makeQuestion = (
  context: QuestionContext,
  {
    repeat,
    category,
    target,
    correct,
    options,
    prompt,
    media = { kind: 'none' },
    presentation,
    details,
  }: QuestionAssembly,
): QuestionDraft => {
  const question: Omit<QuestionDraft, 'repetition'> = {
    answer: {
      correctOptions: typeof correct === 'string' ? [correct] : correct,
      interaction:
        typeof correct === 'string' ? 'single-choice' : 'multi-select',
    },
    category,
    id: `${category}:${target.name}`,
    media,
    options,
    pokemonName: target.name,
    pokemonTypes: target.pokemon.types,
    prompt,
  };
  if (presentation.kind !== 'text' && presentation.numbers !== false) {
    const numbers = getOptionDexNumbers(context, options);
    if (Object.keys(numbers).length > 0) question.optionDexNumbers = numbers;
  }
  if (presentation.kind === 'pokemon-sprites') {
    question.optionVisuals = getOptionVisuals(
      context,
      options,
      presentation.source,
      presentation.silhouette,
    );
    if (presentation.labels === 'concealed')
      question.concealOptionLabels = true;
  }
  if (details) {
    const pokemon = options.flatMap((name) => {
      const entry = context.catalog.pokemon[name];
      return entry ? [[name, entry] as const] : [];
    });
    switch (details.kind) {
      case 'classification':
        question.optionClassifications = Object.fromEntries(
          pokemon.map(([name, entry]) => [
            name,
            entry.isMythical
              ? 'Mythical'
              : entry.isLegendary
                ? 'Legendary'
                : 'Neither',
          ]),
        );
        break;
      case 'generation':
        question.optionGenerations = Object.fromEntries(
          pokemon.map(([name, entry]) => [name, entry.generation]),
        );
        break;
      case 'stat':
        question.optionStats = Object.fromEntries(
          pokemon.map(([name, entry]) => [name, entry.stats[details.stat]]),
        );
    }
  }
  return { ...question, repetition: repeat(question) };
};
