import type { Item } from 'pokenode-ts';
import type { EditorialTopicCatalog } from './editorial-topic-catalog.ts';

const statusPatterns = {
  poison: /\bcures? (?:bad )?poison(?:ing)?\b/i,
  burn: /\bcures? (?:a )?burn\b/i,
  freeze: /\bcures? (?:a )?(?:freez(?:e|ing)|frozen)\b/i,
  sleep: /\bcures? sleep\b/i,
  paralysis: /\bcures? paralysis\b/i,
};

export const buildMedicineChoices = (
  items: Item[],
): EditorialTopicCatalog['medicineChoices'] =>
  items.flatMap((item) => {
    const effect = item.effect_entries.find(
      (entry) => entry.language.name === 'en',
    )?.short_effect;
    if (!effect) return [];
    const all = /\bcures? (?:any|all) status (?:ailments?|conditions?)\b/i.test(
      effect,
    );
    const cures = Object.entries(statusPatterns)
      .filter(([, pattern]) => all || pattern.test(effect))
      .map(([status]) => status);
    const hp = /\brestores? hp to full\b/i.test(effect)
      ? 'full'
      : Number(effect.match(/\brestores? (\d+) hp\b/i)?.[1] ?? 0);
    const safeDistractor =
      ['standard-balls', 'evolution'].includes(item.category.name) &&
      !/\b(cures?|heals?|restores?)\b/i.test(effect);
    if (!cures.length && !hp && !safeDistractor) return [];
    return [
      {
        name: item.name,
        cures,
        hp,
        source: 'https://pokeapi.co/docs/v2#item',
      },
    ];
  });
