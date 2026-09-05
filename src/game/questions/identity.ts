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

export const buildPokedexScanQuestion: QuestionBuilder = (context) => {
  const target = pickTarget(context, ({ sprite }) => Boolean(sprite));
  if (!target?.pokemon.sprite) return undefined;
  return makeQuestion(
    'identity',
    target,
    target.name,
    pokemonOptions(context, target),
    textPrompt('Who is this Pokémon?'),
    { kind: 'sprite', silhouette: false, src: target.pokemon.sprite },
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

export const buildBattleViewQuestion: QuestionBuilder = (context) => {
  const target = pickTarget(context, ({ backSprite }) => Boolean(backSprite));
  if (!target?.pokemon.backSprite) return undefined;

  return {
    ...makeQuestion(
      'identity',
      target,
      target.name,
      pokemonOptions(context, target),
      textPrompt('Who is this Pokémon from behind?'),
      {
        kind: 'sprite',
        silhouette: false,
        src: target.pokemon.backSprite,
      },
    ),
    title: 'Battle view',
  };
};
