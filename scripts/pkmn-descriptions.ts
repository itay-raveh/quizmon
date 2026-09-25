import { Dex } from '@pkmn/dex';
import { generations } from '../src/domain/pokemon/types.ts';
import type { TopicCatalog } from '../src/domain/quiz/topic-catalog.ts';

const usable = (text: string) =>
  text &&
  !/^(No competitive use\.|No additional effect\.|See |Does nothing\.)/i.test(
    text,
  );

const addAbilityDescriptions = (abilities: TopicCatalog['abilities']): void => {
  for (const ability of abilities) {
    const introduced = generations.indexOf(ability.generations[0]!);
    ability.descriptions = generations.flatMap((generation, index) => {
      if (index < introduced) return [];
      const entry = Dex.forGen(index + 1).abilities.get(ability.name);
      if (
        !entry.exists ||
        entry.isNonstandard === 'Future' ||
        !usable(entry.shortDesc)
      )
        return [];
      return [
        {
          generation,
          text: entry.shortDesc,
          explanation: entry.desc || entry.shortDesc,
        },
      ];
    });
  }
};

const addItemDescriptions = (items: TopicCatalog['items']): void => {
  for (const item of items) {
    delete item.descriptions;
    if (item.pocket !== 'misc') continue;
    const descriptions = generations.flatMap((generation, index) => {
      const entry = Dex.forGen(index + 1).items.get(item.name);
      if (entry.isNonstandard || !entry.exists || !usable(entry.shortDesc))
        return [];
      if (!/\b(hold(?:er|s|ing)?|held)\b/i.test(entry.shortDesc)) return [];
      return [
        {
          generation,
          text: entry.shortDesc,
          explanation: entry.desc || entry.shortDesc,
        },
      ];
    });
    if (descriptions.length) item.descriptions = descriptions;
  }
};

export const moveDescriptions = (name: string) =>
  Object.fromEntries(
    generations.flatMap((generation, index) => {
      const entry = Dex.forGen(index + 1).moves.get(name);
      const text = entry.shortDesc;
      if (!entry.exists || entry.isNonstandard || !usable(text)) return [];
      if (
        Dex.types
          .names()
          .some((type) => new RegExp(`\\b${type}\\b`, 'i').test(text))
      )
        return [];
      return [[generation, text]];
    }),
  );

export const addPkmnDescriptions = (topics: TopicCatalog): void => {
  addAbilityDescriptions(topics.abilities);
  addItemDescriptions(topics.items);
  for (const move of topics.moves) {
    delete move.descriptions;
    delete (move as typeof move & { reviewedDescription?: string })
      .reviewedDescription;
    const descriptions = moveDescriptions(move.name);
    if (Object.keys(descriptions).length) move.descriptions = descriptions;
  }
};
