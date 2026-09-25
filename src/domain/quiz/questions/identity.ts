import { pick } from '../../../lib/random.ts';
import { getPixelPeekCrop } from '../../pokemon/pixel-peek.ts';
import type { PokemonKnowledge } from '../../pokemon/types.ts';
import { questionTuning } from '../question-variants.ts';
import { pokemonOptions } from './answers.ts';
import type { AnswerPresentation, QuestionAssembly } from './assembly.ts';
import { makeQuestion } from './assembly.ts';
import type { QuestionContext } from './context.ts';
import { type QuestionBuilder, type QuestionDraft } from './context.ts';
import { pokemonPrompt, textPrompt } from './prompts.ts';
import { targetRepetition } from './repetition.ts';
import { pickFreshTarget, pickTarget } from './selection.ts';

const makeIdentityQuestion = (
  context: QuestionContext,
  {
    target,
    presentation = { kind: 'pokemon' },
    ...question
  }: Pick<QuestionAssembly, 'target' | 'options' | 'prompt' | 'media'> & {
    presentation?: AnswerPresentation;
  },
): QuestionDraft =>
  makeQuestion(context, {
    ...question,
    target,
    correct: target.name,
    category: 'identity',
    repeat: targetRepetition({ pokemonOptions: true }),
    presentation,
  });

const pickScanSprite = (
  pokemon: PokemonKnowledge,
  random: () => number,
  backChance = 0,
  frontChance = questionTuning.frontSpriteChance,
): string | null => {
  if (!pokemon.sprite) return null;

  if (backChance > 0 && (backChance === 1 || random() < backChance)) {
    const back = pokemon.identitySprites.generations
      .filter(({ generation }) =>
        ['I', 'II', 'III', 'IV', 'V'].includes(generation),
      )
      .flatMap(({ back }) => back);
    const sprite = pick(back, random);
    if (sprite) return sprite;
  }
  const generation = pick(
    pokemon.identitySprites.generations.filter(({ generation }) =>
      ['I', 'II', 'III', 'IV', 'V'].includes(generation),
    ),
    random,
  );
  if (!generation) return pokemon.sprite;
  const preferFront = random() < frontChance;
  const usesBack =
    generation.back.length > 0 &&
    (!preferFront || generation.front.length === 0);
  const version = pick(usesBack ? generation.back : generation.front, random);
  return version || pokemon.sprite;
};

export const buildPokedexScanQuestion: QuestionBuilder = (context) => {
  const target = pickTarget(context, ({ sprite }) => Boolean(sprite));
  if (!target) return undefined;
  const currentChance = context.variant?.currentSpriteChance ?? 0;
  const sprite =
    currentChance === 1 ||
    (currentChance > 0 && context.random() < currentChance)
      ? target.pokemon.sprite
      : pickScanSprite(
          target.pokemon,
          context.random,
          context.variant?.backSpriteChance,
          context.variant?.frontSpriteChance,
        );
  if (!sprite) return undefined;
  return makeIdentityQuestion(context, {
    target,
    options: pokemonOptions(context, { correct: target }),
    prompt: textPrompt('Who is this Pokémon?'),
    media: { kind: 'sprite', src: sprite },
  });
};

const buildNamedPokemonQuestion: QuestionBuilder = (context) => {
  const eligible = context.pool.filter(({ pokemon }) => pokemon.sprite);
  const target = pickFreshTarget(context, eligible);
  if (!target) return undefined;
  const options = pokemonOptions(context, {
    correct: target,
    candidates: eligible,
  });
  if (options.length !== 4) return undefined;

  return makeIdentityQuestion(context, {
    target,
    options,
    prompt: pokemonPrompt(target, 'Find ', ''),
    presentation: {
      kind: 'pokemon',
    },
  });
};

export const buildSilhouetteMatchQuestion = buildNamedPokemonQuestion;
export const buildSpriteMatchQuestion = buildNamedPokemonQuestion;

export const buildWhosThatPokemonQuestion: QuestionBuilder = (context) => {
  const target = pickTarget(context, ({ sprite }) => Boolean(sprite));
  if (!target?.pokemon.sprite) return undefined;

  return makeIdentityQuestion(context, {
    target,
    options: pokemonOptions(context, { correct: target }),
    prompt: textPrompt('Who is this Pokémon?'),
    media: { kind: 'sprite', src: target.pokemon.sprite },
  });
};

export const buildPixelPeekQuestion: QuestionBuilder = (context) => {
  const target = pickTarget(context, ({ sprite }) => Boolean(sprite));
  if (!target?.pokemon.sprite) return undefined;

  return makeIdentityQuestion(context, {
    target,
    options: pokemonOptions(context, { correct: target }),
    prompt: textPrompt('Who is hiding in this pixel peek?'),
    media: {
      ...getPixelPeekCrop(
        target.pokemon.spriteMeasurements,
        context.random,
        target.pokemon.pixelPeekFocus,
      ),
      kind: 'pixel-peek',
      src: target.pokemon.sprite,
    },
  });
};

export const buildShinySpotterQuestion: QuestionBuilder = (context) => {
  const eligible = context.pool.filter(
    ({ pokemon }) => pokemon.sprite && pokemon.shinySprite,
  );
  const target = pickFreshTarget(context, eligible);
  if (!target?.pokemon.shinySprite) return undefined;
  const options = pokemonOptions(context, {
    correct: target,
    candidates: eligible,
  });
  if (options.length !== 4) return undefined;

  return makeIdentityQuestion(context, {
    target,
    options,
    prompt: textPrompt('Which Pokémon is shown in its shiny colors?'),
    presentation: {
      kind: 'pokemon',
      source: (pokemon, option) =>
        option === target.name ? pokemon.shinySprite : pokemon.sprite,
    },
  });
};
