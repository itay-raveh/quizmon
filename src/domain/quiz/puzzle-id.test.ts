import { buildDailyForTest } from '../../../tests/fixtures/daily.ts';
import { catalog } from '../../../tests/fixtures/catalog.ts';
import { getDailyPuzzleId, getPuzzleId } from './puzzle-id.ts';

it('identifies the generated lineup without mutable assistance state', async () => {
  const [question, ...rest] = buildDailyForTest('2026-09-12');
  expect(question).toBeDefined();
  const lineup = [question!, ...rest];
  const id = await getPuzzleId(lineup);
  expect(id).toMatch(/^[a-f0-9]{64}$/);
  expect(await getDailyPuzzleId(catalog, '2026-09-12')).toBe(id);
  expect(
    await getPuzzleId([{ ...question!, assistanceUsed: 2 }, ...rest]),
  ).toBe(id);
  expect(
    await getPuzzleId([
      {
        ...question!,
        options: [...question!.options].reverse(),
      },
      ...rest,
    ]),
  ).not.toBe(id);
});
