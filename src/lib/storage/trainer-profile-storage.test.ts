import { resetLocalSave } from '../../../tests/fixtures/local-save';
import { normalizeTrainerProfile } from '../../domain/player/trainer-profile';
import {
  readTrainerProfile,
  saveTrainerProfile,
} from './trainer-profile-storage';

beforeEach(resetLocalSave);

describe('Trainer profile storage', () => {
  beforeEach(() => window.localStorage.clear());

  it('trims names before applying the 20-character limit', async () => {
    const saved = await saveTrainerProfile({
      ...readTrainerProfile(),
      name: `  ${'A'.repeat(21)}  `,
    });
    expect(saved.name).toBe('A'.repeat(20));
    expect(readTrainerProfile().name).toBe(saved.name);
  });

  it('creates, migrates, and saves a normalized local profile', async () => {
    const profile = readTrainerProfile();

    expect(profile.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(profile).toMatchObject({
      avatar: null,
      hasBeenRevealed: false,
      name: '',
      partnerPokemon: null,
      specialty: null,
    });

    const saved = await saveTrainerProfile({
      ...profile,
      avatar: 'leaf-gen3',
      hasBeenRevealed: true,
      name: '  Leaf  ',
      partnerPokemon: 'bulbasaur',
      specialty: 'identity',
    });

    expect(saved).toMatchObject({
      avatar: 'leaf-gen3',
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
    expect(window.localStorage.getItem('quizmon.trainer-profile.v1')).toContain(
      'cardNumber',
    );
  });

  it('normalizes older profiles without an avatar', () => {
    const oldProfile = {
      ...readTrainerProfile(),
      avatar: undefined,
      name: 'Old Trainer',
    };
    expect(normalizeTrainerProfile(oldProfile)).toMatchObject({
      avatar: null,
      name: 'Old Trainer',
    });
  });
});
