import pinned from '@/assets/items/manifest.json';

export const supplementalItemSprites: Readonly<Record<string, string>> =
  Object.fromEntries(
    Object.keys(pinned).map((name) => [name, `/item-sprites/${name}.png`]),
  );
