export const formatLocationLabel = (label: string): string => {
  const match = /^(.+?) \((.*)\)$/.exec(label);
  if (!match) return label;
  const [, location, area] = match;
  return area === location ||
    area!.startsWith(`${location} `) ||
    area!.endsWith(` (${location})`) ||
    area!.endsWith(` ${location}`)
    ? area!
    : label;
};
