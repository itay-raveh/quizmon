import type {
  PackedSpriteMeasurements,
  SpriteMeasurements,
} from '@/game/types';

export const unpackSpriteMeasurements = ([
  area,
  width,
  height,
  centerX,
  bottom,
]: PackedSpriteMeasurements): SpriteMeasurements => ({
  area,
  width,
  height,
  centerX,
  bottom,
});

export const fallbackSpriteMeasurements: SpriteMeasurements = {
  area: 0,
  width: 0.6,
  height: 0.6,
  centerX: 0.5,
  bottom: 0.8,
};

export const arrangeGroup = (
  pokemon: readonly string[],
  sizes: ReadonlyMap<string, SpriteMeasurements>,
) => {
  const sorted = [...pokemon].sort(
    (a, b) => (sizes.get(b)?.area ?? 0) - (sizes.get(a)?.area ?? 0),
  );
  const layers = new Map(sorted.map((name, index) => [name, index + 1]));
  const rowCount = Math.max(1, Math.ceil(sorted.length / 10));
  let offset = 0;
  let baseline = 58;
  return Array.from({ length: rowCount }, (_, row) => {
    const count = Math.ceil((sorted.length - offset) / (rowCount - row));
    const ranked = sorted.slice(offset, offset + count);
    const width = Math.min(28, 175 / Math.max(count, 6));
    const members = [
      ...ranked.filter((_, index) => index % 2 === 0),
      ...ranked.filter((_, index) => index % 2 === 1).reverse(),
    ].map((name) => {
      const size = sizes.get(name) ?? fallbackSpriteMeasurements;
      return { name, size, occupied: size.width * width };
    });
    offset += count;
    const total = members.reduce((sum, { occupied }) => sum + occupied, 0);
    const packing = Math.min(0.9, 84 / Math.max(total, 1));
    const span = total * packing;
    const averageHeight =
      members.reduce((sum, { size }) => sum + size.height, 0) /
      Math.max(count, 1);
    if (row > 0) {
      baseline += Math.min(
        averageHeight * width * 1.12 * 0.58,
        32 / (rowCount - 1),
      );
    }
    let cursor = 50 - span / 2 + (count > 1 ? (row % 2 ? 1.5 : -1.5) : 0);
    return members.map(({ name, size, occupied }) => {
      const slot = occupied * packing;
      const center = cursor + slot / 2;
      cursor += slot;
      const position = span ? (center - 50) / span : 0;
      const mirrored = center < 50;
      const ground = baseline + 3 * (1 - Math.min(1, Math.abs(position) * 2));
      return {
        name,
        left: center - (size.centerX - 0.5) * width * (mirrored ? -1 : 1),
        top: ground - (size.bottom - 0.65) * width * 1.12,
        width,
        mirrored,
        layer: layers.get(name)!,
      };
    });
  }).flat();
};
