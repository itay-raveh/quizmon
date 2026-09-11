import { pick } from '../../../lib/random';
import { getPixelPeekCrop } from '../../pokemon/pixel-peek';
import type { PokemonKnowledge } from '../../pokemon/types';
import { pokemonOptions } from './answers';
import type { AnswerPresentation, QuestionAssembly } from './assembly';
import { makeQuestion } from './assembly';
import type { QuestionContext } from './context';
import { type QuestionBuilder, type QuestionDraft } from './context';
import { pokemonPrompt, textPrompt } from './prompts';
import { targetRepetition } from './repetition';
import { pickFreshTarget, pickTarget } from './selection';

const makeIdentityQuestion = (
  context: QuestionContext,
  {
    target,
    presentation = { kind: 'pokemon-names' },
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
): string | null => {
  if (!pokemon.sprite) return null;

  const generation = pick(
    pokemon.identitySprites.generations.filter(({ generation }) =>
      ['I', 'II', 'III', 'IV', 'V'].includes(generation),
    ),
    random,
  );
  if (!generation) return pokemon.sprite;
  const preferFront = random() < 0.75;
  const usesBack =
    generation.back.length > 0 &&
    (!preferFront || generation.front.length === 0);
  const version = pick(usesBack ? generation.back : generation.front, random);
  return version || pokemon.sprite;
};

export const buildPokedexScanQuestion: QuestionBuilder = (context) => {
  const target = pickTarget(context, ({ sprite }) => Boolean(sprite));
  if (!target) return undefined;
  const sprite = pickScanSprite(target.pokemon, context.random);
  if (!sprite) return undefined;
  return makeIdentityQuestion(context, {
    target,
    options: pokemonOptions(context, { correct: target }),
    prompt: textPrompt('Who is this Pokémon?'),
    media: { kind: 'sprite', silhouette: false, src: sprite },
  });
};

const buildNamedPokemonQuestion =
  (silhouette: boolean): QuestionBuilder =>
  (context) => {
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
        kind: 'pokemon-sprites',
        labels: 'concealed',
        silhouette,
      },
    });
  };

export const buildSilhouetteMatchQuestion = buildNamedPokemonQuestion(true);
export const buildSpriteMatchQuestion = buildNamedPokemonQuestion(false);

export const buildWhosThatPokemonQuestion: QuestionBuilder = (context) => {
  const target = pickTarget(context, ({ sprite }) => Boolean(sprite));
  if (!target?.pokemon.sprite) return undefined;

  return makeIdentityQuestion(context, {
    target,
    options: pokemonOptions(context, { correct: target }),
    prompt: textPrompt('Who is this Pokémon?'),
    media: { kind: 'sprite', silhouette: true, src: target.pokemon.sprite },
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
      kind: 'pokemon-sprites',
      source: (pokemon, option) =>
        option === target.name ? pokemon.shinySprite : pokemon.sprite,
    },
  });
};
