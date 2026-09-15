import {
  readTrainerProfile,
  saveTrainerProfile,
} from './trainer-profile-storage';

describe('Trainer profile storage', () => {
  beforeEach(() => window.localStorage.clear());

  it('trims names before applying the 20-character limit', () => {
    const saved = saveTrainerProfile({
      ...readTrainerProfile(),
      name: `  ${'A'.repeat(21)}  `,
    });
    expect(saved.name).toBe('A'.repeat(20));
    expect(readTrainerProfile().name).toBe(saved.name);
  });

  it('creates and saves a normalized local profile', () => {
    const profile = readTrainerProfile();

    expect(profile.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(profile).toMatchObject({
      hasBeenRevealed: false,
      name: '',
      partnerPokemon: null,
      specialty: null,
    });

    const saved = saveTrainerProfile({
      ...profile,
      hasBeenRevealed: true,
      name: '  Leaf  ',
      partnerPokemon: 'bulbasaur',
      specialty: 'identity',
    });

    expect(saved).toMatchObject({
      hasBeenRevealed: true,
      name: 'Leaf',
      partnerPokemon: 'bulbasaur',
      specialty: 'identity',
    });
    expect(readTrainerProfile()).toEqual(saved);
  });
});
