export const formatLocationLabel = (label: string): string => {
  const match = /^(.+?) \((.*)\)$/.exec(label);
  if (!match) return label;
  const [, location, area] = match;
  if (
    area === location ||
    area!.startsWith(`${location} `) ||
    area!.endsWith(` (${location})`) ||
    area!.endsWith(` ${location}`)
  )
    return formatLocationLabel(area!);
  const words = location!.split(' ');
  for (let length = words.length - 1; length >= 2; length--) {
    const shared = words.slice(-length).join(' ');
    if (area!.startsWith(`${shared} `))
      return `${location} (${area!.slice(shared.length + 1)})`;
  }
  return label;
};
