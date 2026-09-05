import { readTrainerProfile, saveTrainerProfile } from '@/game/trainer-profile';

describe('Trainer profile storage', () => {
  beforeEach(() => window.localStorage.clear());

  it('creates, migrates, and saves a normalized local profile', () => {
    const profile = readTrainerProfile();

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
      JSON.stringify({ ...saved, accent: 'violet', cardNumber: 'QZ-123456' }),
    );
    expect(readTrainerProfile()).toEqual(saved);
    expect(
      JSON.parse(
        window.localStorage.getItem('quizmon.trainer-profile.v1') ?? '{}',
      ),
    ).not.toHaveProperty('cardNumber');
  });
});
