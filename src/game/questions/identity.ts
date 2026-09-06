import {
  getOptionVisuals,
  makeQuestion,
  pick,
  pickTarget,
  pokemonOptions,
  pokemonPrompt,
  textPrompt,
  type QuestionBuilder,
} from './shared';
import type { PokemonKnowledge } from '../types';

const pickScanSprite = (
  pokemon: PokemonKnowledge,
  random: () => number,
): string | null => {
  if (!pokemon.sprite) return null;

  const generation = pick(pokemon.identitySprites.generations, random);
  if (!generation) return pokemon.sprite;
  const preferFront = random() < 0.75;
  const versions = preferFront
    ? generation.front.length > 0
      ? generation.front
      : generation.back
    : generation.back.length > 0
      ? generation.back
      : generation.front;
  const version = pick(versions, random);
  if (!version) return pokemon.sprite;
  const usesBack =
    generation.back.includes(version) &&
    (!preferFront || generation.front.length === 0);

  return `/sprites/pokemon/versions/generation-${generation.generation.toLowerCase()}/${version}/${usesBack ? 'back/' : ''}${pokemon.id}.png`;
};

export const buildPokedexScanQuestion: QuestionBuilder = (context) => {
  const target = pickTarget(context, ({ sprite }) => Boolean(sprite));
  if (!target?.pokemon.sprite) return undefined;
  const sprite = pickScanSprite(target.pokemon, context.random);
  if (!sprite) return undefined;
  return makeQuestion(
    'identity',
    target,
    target.name,
    pokemonOptions(context, target),
    textPrompt('Who is this Pokémon?'),
    { kind: 'sprite', silhouette: false, src: sprite },
  );
};

export const buildSilhouetteMatchQuestion: QuestionBuilder = (context) => {
  const target = pickTarget(context, ({ sprite }) => Boolean(sprite));
  if (!target) return undefined;
  const options = pokemonOptions(context, target).filter(
    (option) => context.catalog.pokemon[option]?.sprite,
  );
  if (options.length !== 4) return undefined;

  return {
    ...makeQuestion(
      'identity',
      target,
      target.name,
      options,
      pokemonPrompt(target, 'Find ', ''),
    ),
    concealOptionLabels: true,
    optionVisuals: getOptionVisuals(context, options, undefined, true),
    title: 'Silhouette match',
  };
};

export const buildPixelPeekQuestion: QuestionBuilder = (context) => {
  const target = pickTarget(context, ({ sprite }) => Boolean(sprite));
  if (!target?.pokemon.sprite) return undefined;

  return {
    ...makeQuestion(
      'identity',
      target,
      target.name,
      pokemonOptions(context, target),
      textPrompt('Who is hiding in this pixel peek?'),
      {
        focusX: pick([25, 50, 75], context.random) ?? 50,
        focusY: pick([25, 50, 75], context.random) ?? 50,
        kind: 'pixel-peek',
        src: target.pokemon.sprite,
      },
    ),
    title: 'Pixel peek',
  };
};

export const buildShinySpotterQuestion: QuestionBuilder = (context) => {
  const target = pickTarget(context, ({ shinySprite, sprite }) =>
    Boolean(shinySprite && sprite),
  );
  if (!target?.pokemon.shinySprite) return undefined;
  const eligible = context.pool.filter(
    ({ pokemon }) => pokemon.sprite && pokemon.shinySprite,
  );
  const options = pokemonOptions(context, target, [], eligible);
  if (options.length !== 4) return undefined;

  return {
    ...makeQuestion(
      'identity',
      target,
      target.name,
      options,
      textPrompt('Which Pokémon is shown in its shiny colors?'),
    ),
    optionVisuals: getOptionVisuals(context, options, (pokemon, option) =>
      option === target.name ? pokemon.shinySprite : pokemon.sprite,
    ),
    title: 'Shiny spotter',
  };
};
