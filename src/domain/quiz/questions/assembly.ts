import { hasOpaqueSpriteCanvas } from '../../pokemon/sprite-source.ts';
import type { SpriteRendering } from '../rendering.ts';
import type { PokemonKnowledge, StatName } from '../../pokemon/types.ts';
import { pick } from '../../../lib/random.ts';
import type {
  PokemonOptionVisual,
  QuestionCategory,
  QuestionPrompt,
  QuestionRepetition,
} from '../types.ts';
import type { Candidate, QuestionContext, QuestionDraft } from './context.ts';
export const getOptionVisuals = (
  context: QuestionContext,
  options: readonly string[],
  getSource: (pokemon: PokemonKnowledge, option: string) => string | null = (
    pokemon,
  ) => pokemon.sprite,
): Record<string, PokemonOptionVisual> =>
  Object.fromEntries(
    options.flatMap((option) => {
      const pokemon = context.catalog.pokemon[option];
      if (!pokemon) return [];
      const src = getSource(pokemon, option);
      return [
        [
          option,
          {
            dexNumber: pokemon.speciesId,
            src,
            types: pokemon.types,
          },
        ] as const,
      ];
    }),
  );

/** Sample era and orientation independently, using only catalogued assets. */
export const choosePokemonSprite = (
  pokemon: Pick<PokemonKnowledge, 'sprite' | 'shinySprite' | 'identitySprites'>,
  policy: Exclude<SpriteRendering, null>,
  random: () => number,
  currentFront: string | null = pokemon.sprite,
): string | null => {
  // A builder-selected alternate color has no catalogued alternate-era/back assets.
  if (currentFront && currentFront === pokemon.shinySprite) return currentFront;
  const roll = (chance = 0) =>
    chance === 1 || (chance > 0 && random() < chance);
  const historical = roll(policy.historicalSpriteChance);
  const back = roll(policy.backSpriteChance);
  const available = pokemon.identitySprites.generations
    .map((era) =>
      policy.silhouette
        ? {
            ...era,
            front: era.front.filter((src) => !hasOpaqueSpriteCanvas(src)),
            back: era.back.filter((src) => !hasOpaqueSpriteCanvas(src)),
          }
        : era,
    )
    .filter(({ front, back }) => front.length > 0 || back.length > 0);
  const older = available.filter(({ generation }) =>
    ['I', 'II', 'III', 'IV', 'V'].includes(generation),
  );
  const era = historical ? pick(older, random) : undefined;
  if (era)
    return (
      pick(back && era.back.length ? era.back : era.front, random) ??
      currentFront
    );
  if (back) {
    const latestBack = available.findLast(({ back }) => back.length > 0);
    return pick(latestBack?.back ?? [], random) ?? currentFront;
  }
  return currentFront;
};
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
  | {
      kind: 'pokemon';
      source?: (pokemon: PokemonKnowledge, option: string) => string | null;
    };
type AnswerDetails =
  | {
      kind: 'classification';
    }
  | {
      kind: 'generation';
    }
  | {
      kind: 'stat';
      stat: StatName;
    };
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
    prompt,
    subject: {
      kind: 'pokemon' as const,
      generation: target.pokemon.generation,
      name: target.name,
      types: target.pokemon.types,
    },
  };
  if (presentation.kind !== 'text') {
    const numbers = getOptionDexNumbers(context, options);
    if (Object.keys(numbers).length > 0) question.optionDexNumbers = numbers;
    question.optionVisuals = getOptionVisuals(
      context,
      options,
      presentation.source,
    );
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
