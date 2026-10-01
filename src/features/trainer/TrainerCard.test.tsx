import { createTrainerProfile } from '@/domain/player/trainer-profile';
import { getTrainerStats } from '@/domain/player/progress';
import { emptyResults } from '@/domain/player/results';
import { renderToStaticMarkup } from 'react-dom/server';
import { TrainerCard } from './TrainerCard';
import { trainerCardPartnerSpriteBehind } from './styles/classes.css.ts';

const renderPartner = (partnerHeight: number, avatar: string) =>
  renderToStaticMarkup(
    <TrainerCard
      trainer={{
        profile: {
          ...createTrainerProfile(),
          avatar,
          partnerPokemon: 'typhlosion-hisui',
        },
        stats: getTrainerStats(emptyResults()),
      }}
      partnerDexNumber={157}
      partnerHeight={partnerHeight}
      partnerSprite="/sprites/pokemon/10233.png"
      partnerSpriteMeasurements={[
        0.251736, 0.604167, 0.802083, 0.520833, 0.864583,
      ]}
      record={{ dayCombo: 0, pokedexFound: 0, pokedexTotal: 1236 }}
    />,
  );

test('places partners behind trainers when their visible height is within 15%', () => {
  expect(renderPartner(8, 'twins-gen2')).toContain(
    trainerCardPartnerSpriteBehind,
  );
  expect(renderPartner(8, 'teamrocket')).not.toContain(
    trainerCardPartnerSpriteBehind,
  );
  expect(renderPartner(16, 'teamrocket')).toContain(
    trainerCardPartnerSpriteBehind,
  );
});
