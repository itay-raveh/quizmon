import { Dex } from '@pkmn/dex';

export const bagItemEffect = (
  name: string,
  text?: string,
): string | undefined => {
  const effect = text?.trim();
  const showdown = Dex.items.get(name);
  return effect &&
    !/^(?:tm|hm|tr)\d+$/i.test(name) &&
    !/^(?:XXX\b|Unknown\b|No effect\b)/i.test(effect) &&
    !/\bGen(?:eration)?\s*[IVX0-9]+\b/i.test(effect) &&
    (!showdown.exists || showdown.isPokeball)
    ? effect
    : undefined;
};
