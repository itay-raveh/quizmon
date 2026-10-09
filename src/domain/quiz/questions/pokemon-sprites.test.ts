import {
  choosePokemonSprites,
  type PokemonSpriteRequest,
} from './pokemon-sprites.ts';
import type { PokemonIdentitySprites } from '../../pokemon/types.ts';
import { createSeededRandom } from '../../../lib/random.ts';

const path = (set: string, id: number, back = false) =>
  `/sprites/pokemon/versions/${set}/${back ? 'back/' : ''}${id}.png`;
const pokemon = (
  id: number,
  generations: PokemonIdentitySprites['generations'],
): PokemonSpriteRequest['pokemon'] => ({
  sprite: `/sprites/pokemon/${id}.png`,
  shinySprite: `/sprites/pokemon/shiny/${id}.png`,
  identitySprites: { currentBack: null, generations },
});
const request = (
  source: PokemonSpriteRequest['pokemon'],
): PokemonSpriteRequest => ({
  pokemon: source,
  policy: { reveal: 'always', silhouette: false, historicalSpriteChance: 1 },
});
const gold = 'generation-ii/gold';
const silver = 'generation-ii/silver';
const emerald = 'generation-iii/emerald';

it('uses the shared game set when the participants have different older inventories', () => {
  const first = pokemon(1, [
    { generation: 'I', front: [path('generation-i/red-blue', 1)], back: [] },
    { generation: 'II', front: [path(gold, 1)], back: [] },
  ]);
  const second = pokemon(152, [
    { generation: 'II', front: [path(gold, 152), path(silver, 152)], back: [] },
  ]);
  const inputs = [request(first), request(second)];
  expect(choosePokemonSprites(inputs, () => 0)).toEqual([
    path(gold, 1),
    path(gold, 152),
  ]);
  expect(
    choosePokemonSprites(inputs, createSeededRandom('shared-set')),
  ).toEqual(choosePokemonSprites(inputs, createSeededRandom('shared-set')));
});

it('does not confuse two games within one generation with a shared set', () => {
  const first = pokemon(1, [
    { generation: 'II', front: [path(gold, 1)], back: [] },
  ]);
  const second = pokemon(152, [
    { generation: 'II', front: [path(silver, 152)], back: [] },
  ]);
  expect(
    choosePokemonSprites([request(first), request(second)], () => 0),
  ).toEqual([first.sprite, second.sprite]);
});

it('keeps the entire comparison current if one participant has no compatible old art', () => {
  const first = pokemon(1, [
    { generation: 'II', front: [path(gold, 1)], back: [] },
  ]);
  const second = pokemon(658, []);
  expect(
    choosePokemonSprites([request(first), request(second)], () => 0),
  ).toEqual([first.sprite, second.sprite]);
});

it('keeps current mode current even when the only available backs belong to an old set', () => {
  const source = pokemon(1, [
    { generation: 'II', front: [path(gold, 1)], back: [path(gold, 1, true)] },
  ]);
  const input = request(source);
  input.policy = {
    ...input.policy,
    historicalSpriteChance: 0,
    backSpriteChance: 1,
  };
  expect(choosePokemonSprites([input], () => 0)).toEqual([source.sprite]);
});

it('uses a catalogued current back only when it matches the actual current-front set', () => {
  const set = 'generation-ix/scarlet-violet';
  const source = pokemon(1, [
    { generation: 'IX', front: [path(set, 1)], back: [path(set, 1, true)] },
  ]);
  const input = request(source);
  input.currentFront = path(set, 1);
  input.policy = {
    ...input.policy,
    historicalSpriteChance: 0,
    backSpriteChance: 1,
  };
  expect(choosePokemonSprites([input], () => 0)).toEqual([path(set, 1, true)]);
});

it('keeps front/back fallback inside the chosen game rather than switching eras', () => {
  const first = pokemon(1, [
    { generation: 'II', front: [path(gold, 1)], back: [path(gold, 1, true)] },
  ]);
  const second = pokemon(152, [
    { generation: 'II', front: [path(gold, 152)], back: [] },
  ]);
  const inputs = [request(first), request(second)].map((input) => ({
    ...input,
    policy: { ...input.policy, backSpriteChance: 1 },
  }));
  expect(choosePokemonSprites(inputs, () => 0)).toEqual([
    path(gold, 1, true),
    path(gold, 152),
  ]);
});

it('intersects usable art after applying each role’s concealment constraint', () => {
  const first = pokemon(1, [
    { generation: 'II', front: [path(gold, 1)], back: [] },
    { generation: 'III', front: [path(emerald, 1)], back: [] },
  ]);
  const second = pokemon(152, [
    { generation: 'II', front: [path(gold, 152)], back: [] },
    { generation: 'III', front: [path(emerald, 152)], back: [] },
  ]);
  const concealed = request(first);
  concealed.policy = { ...concealed.policy, silhouette: true };
  expect(choosePokemonSprites([concealed, request(second)], () => 0)).toEqual([
    path(emerald, 1),
    path(emerald, 152),
  ]);
  expect(
    choosePokemonSprites(
      [
        concealed,
        request(pokemon(152, second.identitySprites.generations.slice(0, 1))),
      ],
      () => 0,
    ),
  ).toEqual([first.sprite, second.sprite]);
});

it('keeps shiny colors and ordinary distractors on current art when old shiny sets are unavailable', () => {
  const source = pokemon(1, [
    { generation: 'II', front: [path(gold, 1)], back: [] },
  ]);
  const shiny = { ...request(source), currentFront: source.shinySprite };
  expect(choosePokemonSprites([shiny, request(source)], () => 0)).toEqual([
    source.shinySprite,
    source.sprite,
  ]);
});

it('honors an explicitly current participating role instead of mixing it with old choices', () => {
  const source = pokemon(1, [
    { generation: 'II', front: [path(gold, 1)], back: [] },
  ]);
  const current = request(source);
  current.policy = { ...current.policy, historicalSpriteChance: 0 };
  expect(choosePokemonSprites([current, request(source)], () => 0)).toEqual([
    source.sprite,
    source.sprite,
  ]);
});

it('uses actual form current backs independently of historical selection and keeps a missing back current', () => {
  const first = pokemon(10115, [
    {
      generation: 'II',
      front: [path(gold, 10115)],
      back: [path(gold, 10115, true)],
    },
  ]);
  first.identitySprites.currentBack = '/sprites/pokemon/back/10115.png';
  const second = pokemon(658, []);
  const inputs = [request(first), request(second)].map((input) => ({
    ...input,
    policy: { ...input.policy, historicalSpriteChance: 0, backSpriteChance: 1 },
  }));
  expect(choosePokemonSprites(inputs, () => 0)).toEqual([
    first.identitySprites.currentBack,
    second.sprite,
  ]);
  // An empty historical intersection falls back to the same current set, retaining backs.
  expect(
    choosePokemonSprites(
      inputs.map((input) => ({
        ...input,
        policy: { ...input.policy, historicalSpriteChance: 1 },
      })),
      () => 0,
    ),
  ).toEqual([first.identitySprites.currentBack, second.sprite]);
  expect(
    choosePokemonSprites(
      [{ ...inputs[0]!, currentFront: first.shinySprite }],
      () => 0,
    ),
  ).toEqual([first.shinySprite]);
});
