import { createTrainerProfile } from '@/domain/player/trainer-profile';
import { renderToStaticMarkup } from 'react-dom/server';
import { TrainerCard } from './TrainerCard';

const renderPartner = (partnerHeight: number, avatar: string) =>
  renderToStaticMarkup(
    <TrainerCard
      profile={{
        ...createTrainerProfile(),
        avatar,
        partnerPokemon: 'typhlosion-hisui',
      }}
      partnerDexNumber={157}
      partnerHeight={partnerHeight}
      partnerSprite="/sprites/pokemon/10233.png"
      partnerSpriteMeasurements={[
        0.251736, 0.604167, 0.802083, 0.520833, 0.864583,
      ]}
      rank="Youngster"
      record={{ dayCombo: 0, pokedexFound: 0, pokedexTotal: 1236 }}
    />,
  );

test('places partners behind trainers when their visible height is within 15%', () => {
  expect(renderPartner(8, 'twins-gen2')).toContain(
    'trainer-card__partner-sprite trainer-card__partner-sprite--behind',
  );
  expect(renderPartner(8, 'teamrocket')).not.toContain(
    'trainer-card__partner-sprite--behind',
  );
  expect(renderPartner(16, 'teamrocket')).toContain(
    'trainer-card__partner-sprite trainer-card__partner-sprite--behind',
  );
});
