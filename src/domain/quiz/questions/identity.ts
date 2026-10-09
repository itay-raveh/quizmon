import type { FamilyRules, PokemonDistractors } from './family-rules.ts';
import { getPixelPeekCrop } from '../../pokemon/pixel-peek.ts';
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

const buildNamedPokemonQuestion: QuestionBuilder<PokemonDistractors> = (
  context,
) => {
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

export const buildSpriteMatchQuestion = buildNamedPokemonQuestion;

export const buildPokemonIdentificationQuestion: QuestionBuilder<
  FamilyRules['pokemonIdentification']
> = (context) => {
  const target = pickTarget(context, ({ sprite }) => Boolean(sprite));
  if (!target?.pokemon.sprite) return undefined;

  return makeIdentityQuestion(context, {
    target,
    options: pokemonOptions(context, { correct: target }),
    prompt: textPrompt('Who is this Pokémon?'),
    media: { kind: 'sprite', src: target.pokemon.sprite },
  });
};

export const buildPixelPeekQuestion: QuestionBuilder<
  FamilyRules['pokemonFromPixelCrop']
> = (context) => {
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
      kind: 'pokemonFromPixelCrop',
      src: target.pokemon.sprite,
    },
  });
};

export const buildShinySpotterQuestion: QuestionBuilder<
  FamilyRules['shinyPokemonIdentification']
> = (context) => {
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
