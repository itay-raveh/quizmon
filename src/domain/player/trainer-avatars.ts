import avatarIds from './data/trainer-avatars.json';

export const trainerAvatarOptions = avatarIds.map((id) => ({
  id,
  name: id
    .replace(/-gen\d.*$/, '')
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' '),
}));

const trainerAvatarIds = new Set<string>(avatarIds);

export const isTrainerAvatar = (value: unknown): value is string =>
  typeof value === 'string' && trainerAvatarIds.has(value);
