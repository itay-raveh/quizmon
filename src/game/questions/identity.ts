import { targetRepetition } from './repetition';
import { pick } from '../random';
import { getPixelPeekCrop } from '../pixel-peek';
import {
  getOptionVisuals,
  makeQuestion,
  pickTarget,
  pickFreshTarget,
  pokemonOptions,
  pokemonPrompt,
  textPrompt,
  type Candidate,
  type QuestionBuilder,
  type QuestionDraft,
} from './shared';
import type { PokemonKnowledge, QuestionPrompt } from '../types';

const makeIdentityQuestion = (
  target: Candidate,
  options: string[],
  prompt: QuestionPrompt,
  media?: QuestionDraft['media'],
): QuestionDraft =>
  makeQuestion(
    targetRepetition({ pokemonOptions: true }),
    'identity',
    target,
    target.name,
    options,
    prompt,
    media,
  );

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
  return makeIdentityQuestion(
    target,
    pokemonOptions(context, target),
    textPrompt('Who is this Pokémon?'),
    { kind: 'sprite', silhouette: false, src: sprite },
  );
};

const buildNamedPokemonQuestion =
  (silhouette: boolean): QuestionBuilder =>
  (context) => {
    const eligible = context.pool.filter(({ pokemon }) => pokemon.sprite);
    const target = pickFreshTarget(context, eligible);
    if (!target) return undefined;
    const options = pokemonOptions(context, target, [], eligible);
    if (options.length !== 4) return undefined;

    return {
      ...makeIdentityQuestion(
        target,
        options,
        pokemonPrompt(target, 'Find ', ''),
      ),
      concealOptionLabels: true,
      optionVisuals: getOptionVisuals(context, options, undefined, silhouette),
    };
  };

export const buildSilhouetteMatchQuestion = buildNamedPokemonQuestion(true);
export const buildSpriteMatchQuestion = buildNamedPokemonQuestion(false);

export const buildWhosThatPokemonQuestion: QuestionBuilder = (context) => {
  const target = pickTarget(context, ({ sprite }) => Boolean(sprite));
  if (!target?.pokemon.sprite) return undefined;

  return makeIdentityQuestion(
    target,
    pokemonOptions(context, target),
    textPrompt('Who is this Pokémon?'),
    { kind: 'sprite', silhouette: true, src: target.pokemon.sprite },
  );
};

export const buildPixelPeekQuestion: QuestionBuilder = (context) => {
  const target = pickTarget(context, ({ sprite }) => Boolean(sprite));
  if (!target?.pokemon.sprite) return undefined;

  return makeIdentityQuestion(
    target,
    pokemonOptions(context, target),
    textPrompt('Who is hiding in this pixel peek?'),
    {
      ...getPixelPeekCrop(
        target.pokemon.spriteMeasurements,
        context.random,
        target.pokemon.pixelPeekFocus,
      ),
      kind: 'pixel-peek',
      src: target.pokemon.sprite,
    },
  );
};

export const buildShinySpotterQuestion: QuestionBuilder = (context) => {
  const eligible = context.pool.filter(
    ({ pokemon }) => pokemon.sprite && pokemon.shinySprite,
  );
  const target = pickFreshTarget(context, eligible);
  if (!target?.pokemon.shinySprite) return undefined;
  const options = pokemonOptions(context, target, [], eligible);
  if (options.length !== 4) return undefined;

  return {
    ...makeIdentityQuestion(
      target,
      options,
      textPrompt('Which Pokémon is shown in its shiny colors?'),
    ),
    optionVisuals: getOptionVisuals(context, options, (pokemon, option) =>
      option === target.name ? pokemon.shinySprite : pokemon.sprite,
    ),
  };
};
