import berries from '../../pokemon/data/topics-berries-0.json' with { type: 'json' };
import type { PokemonCatalog } from '../../pokemon/types.ts';
import { buildBerry } from './berries.ts';
import { getQuestionVariant } from '../variants.ts';
import { gameLevels } from '../level.ts';

const question = (name: string) => {
  const level = gameLevels.find((level) =>
    getQuestionVariant('naturalGift', level),
  )!;
  const berry = berries.values.find((entry) => entry.name === name)!;
  const catalog = {
    typeRelations: Object.fromEntries(
      [...new Set(berries.values.map((entry) => entry.giftType))]
        .filter(Boolean)
        .map((type) => [type, {}]),
    ),
    topics: {
      berries: [berry],
      items: [{ name: berry.item, label: berry.label, sprite: '/berry.png' }],
    },
  } as unknown as PokemonCatalog;
  return buildBerry({
    catalog,
    generations: ['VI'],
    pool: [],
    questionType: 'naturalGift',
    variant: getQuestionVariant('naturalGift', level)!.variant,
    random: () => 0.5,
    used: new Set(),
  });
};

it('uses Natural Gift types for flavorless berries', () => {
  expect(question('kee')?.answer.correctOptions).toEqual(['fairy']);
  expect(question('maranga')?.answer.correctOptions).toEqual(['dark']);
});
