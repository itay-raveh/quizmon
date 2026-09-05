import { readTrainerProfile, saveTrainerProfile } from '@/game/trainer-profile';

describe('Trainer profile storage', () => {
  beforeEach(() => window.localStorage.clear());

  it('creates and saves a normalized local profile', () => {
    const profile = readTrainerProfile();

    expect(profile.cardNumber).toMatch(/^QZ-\d{6}$/);
    expect(profile.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(profile).toMatchObject({
      hasBeenRevealed: false,
      name: '',
      partnerPokemon: null,
      specialty: null,
      version: 1,
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

    window.localStorage.setItem(
      'quizmon.trainer-profile.v1',
      JSON.stringify({ ...saved, accent: 'violet' }),
    );
    expect(readTrainerProfile()).toEqual(saved);
  });
});
