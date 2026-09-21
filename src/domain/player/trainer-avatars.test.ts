import { createSearch, normalizeSearch } from '../pokemon/search';
import { trainerAvatarOptions } from './trainer-avatars';

const byId = (id: string) =>
  trainerAvatarOptions.find((avatar) => avatar.id === id)?.name;

it('shows readable, distinct names for trainer classes and sprite variants', () => {
  expect(byId('acetrainer')).toBe('Ace Trainer');
  expect(byId('acetrainer-gen1rb')).toBe('Ace Trainer · Gen 1 RB');
  expect(byId('acetrainerf-gen1')).toBe('Ace Trainer (Female) · Gen 1');
  expect(byId('birdkeeper')).toBe('Bird Keeper');
  expect(byId('blue-gen1champion')).toBe('Blue · Gen 1 Champion');
  expect(byId('expertf-gen3')).toBe('Expert (Female) · Gen 3');
  expect(new Set(trainerAvatarOptions.map(({ name }) => name)).size).toBe(
    trainerAvatarOptions.length,
  );
});

it('finds trainer sprites despite spacing and spelling mistakes', () => {
  const search = createSearch(
    trainerAvatarOptions.map((avatar) => ({
      ...avatar,
      label: avatar.name,
      normalized: normalizeSearch(avatar.name),
      aliases: [normalizeSearch(avatar.id)],
    })),
  );
  expect(search('ace trianer')[0]?.id).toBe('acetrainer');
  expect(search('bird kepper').some(({ id }) => id === 'birdkeeper')).toBe(
    true,
  );
});
