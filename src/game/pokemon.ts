import type { PokemonClient } from 'pokenode-ts';
import { useCallback, useEffect, useState } from 'react';
import { selectPokemonSprite, type SpriteData } from './sprite';
import type { QuestionData } from './types';

type PokemonState =
  | { status: 'loading'; sprite?: never }
  | { status: 'ready'; sprite: SpriteData | null }
  | { status: 'error'; sprite?: never };

let pokemonClientPromise: Promise<PokemonClient> | undefined;
const preparedPokemon = new Map<string, Promise<SpriteData | null>>();

const getPokemonClient = () => {
  pokemonClientPromise ??= import('pokenode-ts').then(
    ({ PokemonClient }) => new PokemonClient(),
  );
  return pokemonClientPromise;
};

const getPreparationKey = (question: QuestionData, randomSprite: boolean) =>
  `${question.pokemonName}:${randomSprite ? 'random' : 'best'}:${question.spriteRandom}`;

const decodeSprite = async (sprite: SpriteData | null) => {
  if (!sprite || typeof Image === 'undefined') return sprite;

  const image = new Image();
  image.src = sprite.src;
  await image.decode?.();
  return sprite;
};

const preparePokemon = (question: QuestionData, randomSprite: boolean) => {
  const key = getPreparationKey(question, randomSprite);
  const existing = preparedPokemon.get(key);
  if (existing) return existing;

  const request = getPokemonClient()
    .then((client) => client.getPokemonByName(question.pokemonName))
    .then((pokemon) =>
      selectPokemonSprite(pokemon.sprites, randomSprite, question.spriteRandom),
    )
    .then(decodeSprite)
    .catch((error: unknown) => {
      preparedPokemon.delete(key);
      throw error;
    });

  preparedPokemon.set(key, request);
  return request;
};

export const preloadPokemon = (
  question: QuestionData,
  randomSprite: boolean,
) => {
  void preparePokemon(question, randomSprite).catch(() => undefined);
};

export const usePokemon = (question: QuestionData, randomSprite: boolean) => {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<PokemonState>({ status: 'loading' });
  const preparationKey = getPreparationKey(question, randomSprite);

  useEffect(() => {
    let active = true;

    void preparePokemon(question, randomSprite)
      .then((sprite) => {
        if (!active) return;
        setState({ status: 'ready', sprite });
      })
      .catch(() => {
        if (!active) return;
        setState({ status: 'error' });
      });

    return () => {
      active = false;
    };
  }, [attempt, preparationKey, question, randomSprite]);

  const retry = useCallback(() => {
    preparedPokemon.delete(preparationKey);
    setState({ status: 'loading' });
    setAttempt((current) => current + 1);
  }, [preparationKey]);

  return { ...state, retry };
};
