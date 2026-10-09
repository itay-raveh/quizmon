import { hasOpaqueSpriteCanvas } from '../../pokemon/sprite-source.ts';
import type { PokemonKnowledge } from '../../pokemon/types.ts';
import type { SpriteRendering } from '../rendering.ts';
import { pick } from '../../../lib/random.ts';

export interface PokemonSpriteRequest {
  pokemon: Pick<PokemonKnowledge, 'sprite' | 'shinySprite' | 'identitySprites'>;
  policy: Exclude<SpriteRendering, null>;
  currentFront?: string | null;
}

interface SpriteSet {
  front: string[];
  back: string[];
}

/** The game/version is part of the set: Gold and Silver are distinct artwork. */
const spriteSet = (src: string) =>
  src.match(/^\/sprites\/pokemon\/versions\/(generation-[^/]+\/[^/]+)\//)?.[1];
const isHistoricalSet = (set: string) =>
  /^generation-(?:i|ii|iii|iv|v)\//.test(set);
const pathsFor = (set: SpriteSet, back: boolean) =>
  back && set.back.length ? set.back : set.front;

const compatibleSets = (
  { pokemon, policy, currentFront = pokemon.sprite }: PokemonSpriteRequest,
  back: boolean,
): Map<string, SpriteSet> => {
  const sets = new Map<string, SpriteSet>();
  // Alternate colors have no catalogued versions; never substitute ordinary art.
  if (currentFront && currentFront === pokemon.shinySprite) return sets;
  for (const era of pokemon.identitySprites.generations) {
    for (const orientation of ['front', 'back'] as const) {
      for (const src of era[orientation]) {
        if (policy.silhouette && hasOpaqueSpriteCanvas(src)) continue;
        const key = spriteSet(src);
        if (!key) continue;
        const assets = sets.get(key) ?? { front: [], back: [] };
        assets[orientation].push(src);
        sets.set(key, assets);
      }
    }
  }
  return new Map(
    [...sets].filter(([, assets]) => pathsFor(assets, back).length > 0),
  );
};

/** Resolve one shared historical game/version, or keep every participant current. */
export const choosePokemonSprites = (
  requests: readonly PokemonSpriteRequest[],
  random: () => number,
): (string | null)[] => {
  if (!requests.length) return [];
  const roll = (chance = 0) =>
    chance === 1 || (chance > 0 && random() < chance);
  // Normally these policies are already sampled. Explicit current roles stay current.
  const historical = roll(
    Math.min(
      ...requests.map(({ policy }) => policy.historicalSpriteChance ?? 0),
    ),
  );
  const backs = requests.map(({ policy }) => roll(policy.backSpriteChance));
  if (!historical && !backs.some(Boolean))
    return requests.map(
      ({ pokemon, currentFront = pokemon.sprite }) => currentFront,
    );
  const available = requests.map((request, index) =>
    compatibleSets(request, backs[index]!),
  );
  const common = [...available[0]!.keys()].filter(
    (set) => isHistoricalSet(set) && available.every((sets) => sets.has(set)),
  );
  const selectedSet = historical ? pick(common, random) : undefined;
  return requests.map(({ pokemon, currentFront = pokemon.sprite }, index) => {
    const sets = available[index]!;
    if (selectedSet)
      return (
        pick(pathsFor(sets.get(selectedSet)!, backs[index]!), random) ?? null
      );
    // Current backs belong to the form's ordinary current front, never its shiny art.
    if (backs[index] && currentFront === pokemon.sprite)
      return pokemon.identitySprites.currentBack ?? currentFront;
    // Explicit versioned fronts can use backs from that exact same game.
    const currentSet = currentFront ? spriteSet(currentFront) : undefined;
    const currentAssets = currentSet ? sets.get(currentSet) : undefined;
    return (
      (backs[index] && currentAssets
        ? pick(currentAssets.back, random)
        : undefined) ?? currentFront
    );
  });
};
