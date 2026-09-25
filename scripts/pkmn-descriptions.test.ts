import { moveDescriptions } from './pkmn-descriptions.ts';

it('keeps historical move hints tied to their battle generation', () => {
  const descriptions = moveDescriptions('rapid-spin');
  expect(descriptions.VI).not.toContain('+1 Spe');
  expect(descriptions.IX).toContain('+1 Spe');
});
