import seedrandom from 'seedrandom';

export const pick = <T>(
  values: readonly T[],
  random: () => number,
): T | undefined => values[Math.floor(random() * values.length)];

export const shuffle = <T>(
  values: readonly T[],
  random: () => number = Math.random,
): T[] => {
  const shuffled = [...values];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[target]] = [
      shuffled[target] as T,
      shuffled[index] as T,
    ];
  }

  return shuffled;
};

export type RandomSeed = string | readonly (string | number)[];

export const createSeededRandom = (seed: RandomSeed): (() => number) =>
  seedrandom(typeof seed === 'string' ? seed : JSON.stringify(seed), {
    global: false,
  });

export const createRoundSeed = (): string =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
