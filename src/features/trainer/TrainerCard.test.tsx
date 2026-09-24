import { createTrainerProfile } from '@/domain/player/trainer-profile';
import { trainerAvatarOptions } from '@/domain/player/trainer-avatars';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, test } from 'vitest';
import { TrainerCard } from './TrainerCard';

test('positions the partner at the trainer ground line on first render', () => {
  const profile = {
    ...createTrainerProfile(),
    avatar: 'aaron',
    partnerPokemon: 'pikachu',
  };
  const render = (avatar: string | null) =>
    renderToStaticMarkup(
      <TrainerCard
        profile={{ ...profile, avatar }}
        partnerDexNumber={25}
        partnerSprite="/sprites/pokemon/pikachu.png"
        rank="Youngster"
        record={{ dayCombo: 0, pokedexFound: 0, pokedexTotal: 1 }}
      />,
    );

  const bottom = trainerAvatarOptions.find(
    ({ id }) => id === profile.avatar,
  )!.bottom;
  expect(render(profile.avatar)).toContain(
    `bottom:calc(${(1 - bottom) * 100}% - `,
  );
  expect(render(profile.avatar)).not.toContain('partner-sprite--pending');
  expect(render(null)).toContain('bottom:calc(0% - ');
});
