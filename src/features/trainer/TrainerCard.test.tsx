import { createTrainerProfile } from '@/domain/player/trainer-profile';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, test } from 'vitest';
import { TrainerCard } from './TrainerCard';

test('holds the partner until the trainer avatar establishes its ground line', () => {
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

  expect(render(profile.avatar)).toContain(
    'trainer-card__partner-sprite trainer-card__partner-sprite--pending',
  );
  expect(render(null)).not.toContain('trainer-card__partner-sprite--pending');
});
