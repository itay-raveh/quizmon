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

interface SpriteBucket {
  candidates: readonly string[];
  weight: number;
}

const pickScanSprite = (
  pokemon: PokemonKnowledge,
  random: () => number,
): string | null => {
  if (!pokemon.sprite) return null;

  const buckets: SpriteBucket[] = [
    { candidates: [pokemon.sprite], weight: 45 },
    {
      candidates: pokemon.identitySprites.historicalFront,
      weight: 30,
    },
    {
      candidates: pokemon.identitySprites.currentBack
        ? [pokemon.identitySprites.currentBack]
        : [],
      weight: 15,
    },
    {
      candidates: pokemon.identitySprites.historicalBack,
      weight: 10,
    },
  ].filter(({ candidates }) => candidates.length > 0);
  const totalWeight = buckets.reduce((total, { weight }) => total + weight, 0);
  let selection = random() * totalWeight;
  const bucket =
    buckets.find(({ weight }) => {
      selection -= weight;
      return selection < 0;
    }) ?? buckets[0];

  return pick(bucket?.candidates ?? [pokemon.sprite], random) ?? pokemon.sprite;
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
