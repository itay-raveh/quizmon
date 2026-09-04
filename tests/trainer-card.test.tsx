import { render, screen } from '@testing-library/react';
import { TrainerCard } from '@/components/TrainerCard';
import type { TrainerStats } from '@/game/storage';
import type { TrainerProfile } from '@/game/trainer-profile';

const profile: TrainerProfile = {
  accent: 'violet',
  cardNumber: 'QZ-123456',
  createdAt: '2026-09-03',
  hasBeenRevealed: true,
  name: 'Leaf',
  partnerPokemon: 'bulbasaur',
  specialty: 'type',
  version: 1,
};

const stats: TrainerStats = {
  bestDailyStreak: 7,
  categories: { type: { correct: 10, total: 11 } },
  championAnswersWithoutClues: 1,
  correctGenerations: { I: 2, II: 1, III: 1 },
  correctQuestionTypes: {},
  dailyChallengesCompleted: 8,
  gamesCompleted: 25,
  masteryRounds: 3,
  perfectRounds: 3,
};

describe('Trainer Card', () => {
  it('renders the selected specialty as a title on the front', () => {
    render(
      <TrainerCard
        face="front"
        partnerDexNumber={1}
        partnerSprite="/sprites/pokemon/1.png"
        profile={profile}
        stats={stats}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Leaf' })).toBeVisible();
    expect(screen.getByText('Type Specialist')).toBeVisible();
  });

  it('renders records and one-time League Badges on the back', () => {
    render(
      <TrainerCard
        face="records"
        partnerDexNumber={null}
        partnerSprite={null}
        profile={profile}
        stats={stats}
      />,
    );

    expect(
      screen.getByRole('article', { name: 'Trainer Card records' }),
    ).toBeVisible();
    expect(screen.getByText('Daily clears')).toBeVisible();
    expect(
      screen.getByRole('region', {
        name: 'League badges: 2 of 5 earned',
      }),
    ).toBeVisible();
    expect(
      screen.getByRole('img', {
        name: /Many Paths: Locked\. 0 of 10/,
      }),
    ).toBeVisible();
    expect(
      screen.queryByRole('heading', { name: 'Leaf' }),
    ).not.toBeInTheDocument();
  });
});
