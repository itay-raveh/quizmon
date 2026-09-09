import { targetRepetition } from './repetition';
import { pick } from '../random';
import { getVersionSpritePath } from '../sprite-source';
import {
  getOptionVisuals,
  makeQuestion,
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
  if (!version) return pokemon.sprite;

  return getVersionSpritePath(
    generation.generation,
    version,
    usesBack ? 'back' : 'front',
    pokemon.id,
  );
};

export const buildPokedexScanQuestion: QuestionBuilder = (context) => {
  const target = pickTarget(context, ({ sprite }) => Boolean(sprite));
  if (!target) return undefined;
  const sprite = pickScanSprite(target.pokemon, context.random);
  if (!sprite) return undefined;
  return makeQuestion(
    targetRepetition({ pokemonOptions: true }),
    'identity',
    target,
    target.name,
    pokemonOptions(context, target),
    textPrompt('Who is this Pokémon?'),
    { kind: 'sprite', silhouette: false, src: sprite },
  );
};

const buildNamedPokemonQuestion =
  (silhouette: boolean): QuestionBuilder =>
  (context) => {
    const target = pickTarget(context, ({ sprite }) => Boolean(sprite));
    if (!target) return undefined;
    const options = pokemonOptions(
      context,
      target,
      [],
      context.pool.filter(({ pokemon }) => Boolean(pokemon.sprite)),
    );
    if (options.length !== 4) return undefined;

    return {
      ...makeQuestion(
        targetRepetition({ pokemonOptions: true }),
        'identity',
        target,
        target.name,
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

  return makeQuestion(
    targetRepetition({ pokemonOptions: true }),
    'identity',
    target,
    target.name,
    pokemonOptions(context, target),
    textPrompt('Who is this Pokémon?'),
    { kind: 'sprite', silhouette: true, src: target.pokemon.sprite },
  );
};

export const buildPixelPeekQuestion: QuestionBuilder = (context) => {
  const target = pickTarget(context, ({ sprite }) => Boolean(sprite));
  if (!target?.pokemon.sprite) return undefined;

  return makeQuestion(
    targetRepetition({ pokemonOptions: true }),
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
  );
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
      targetRepetition({ pokemonOptions: true }),
      'identity',
      target,
      target.name,
      options,
      textPrompt('Which Pokémon is shown in its shiny colors?'),
    ),
    optionVisuals: getOptionVisuals(context, options, (pokemon, option) =>
      option === target.name ? pokemon.shinySprite : pokemon.sprite,
    ),
  };
};
