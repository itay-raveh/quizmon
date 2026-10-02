import type { MoveVisual } from './types.ts';

export const moveVisual = (type: string, damageClass: string): MoveVisual => ({
  ...(type ? { sprite: `/sprites/items/tm-${type}.png`, type } : {}),
  ...(damageClass ? { damageClass } : {}),
});
