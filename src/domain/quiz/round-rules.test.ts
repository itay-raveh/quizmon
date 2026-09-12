import { result } from '../../../tests/fixtures/result';
import { getRulesScoreKey, isRoundRules } from './round-rules';
import type { GameResult, RoundRules } from './types';

const rules: RoundRules = {
  version: 1,
  difficulty: 3,
  generations: ['I', 'II'],
  formGroups: ['standard', 'regional'],
  questionTypes: ['type-check', 'pokedex-scan'],
};
const scored: GameResult = { ...result, rules };

describe('round rule score comparison', () => {
  it('compares equivalent sets independently of selection order', () => {
    expect(
      getRulesScoreKey({
        ...scored,
        rules: {
          ...rules,
          generations: ['II', 'I'],
          formGroups: ['regional', 'standard'],
          questionTypes: ['pokedex-scan', 'type-check'],
        },
      }),
    ).toBe(getRulesScoreKey(scored));
  });

  it.each([
    { difficulty: 4 },
    { generations: ['I'] },
    { formGroups: ['standard'] },
    { questionTypes: ['type-check'] },
    { version: 2 },
  ] as const)('separates different rules %j', (patch) => {
    expect(
      getRulesScoreKey({
        ...scored,
        rules: { ...rules, ...patch } as RoundRules,
      }),
    ).not.toBe(getRulesScoreKey(scored));
  });

  it('separates catalog and score versions and preserves legacy identity', () => {
    expect(getRulesScoreKey(result)).toBeUndefined();
    expect(getRulesScoreKey({ ...scored, contentVersion: 99 })).not.toBe(
      getRulesScoreKey(scored),
    );
    expect(getRulesScoreKey({ ...scored, scoreVersion: 99 })).not.toBe(
      getRulesScoreKey(scored),
    );
  });

  it.each([
    null,
    {},
    { ...rules, difficulty: '3' },
    { ...rules, generations: [] },
    { ...rules, questionTypes: ['invented'] },
  ])('rejects invalid saved rule context %j', (value) =>
    expect(isRoundRules(value)).toBe(false),
  );
});
