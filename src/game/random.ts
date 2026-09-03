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
