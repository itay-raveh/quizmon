import { render, screen } from '@testing-library/react';
import { TrainerCard } from '@/components/TrainerCard';
import type { TrainerProfile, TrainerStats } from '@/game/storage';

const profile: TrainerProfile = {
  accent: 'violet',
  cardNumber: 'QZ-123456',
  createdAt: '2026-09-03',
  hasBeenRevealed: true,
  name: 'Leaf',
  partnerPokemon: 'bulbasaur',
  version: 2,
};

const stats: TrainerStats = {
  bestDailyStreak: 7,
  categories: { type: { correct: 9, total: 10 } },
  dailyChallengesCompleted: 8,
  gamesCompleted: 25,
  perfectRounds: 3,
  specialty: { category: 'type', correct: 9, total: 10 },
};

describe('Trainer Card', () => {
  it('renders earned records, specialty, and stamps on the back', () => {
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
    expect(screen.getByText('Types')).toBeVisible();
    expect(screen.getByText('Perfect Form')).toBeVisible();
    expect(
      screen.queryByRole('heading', { name: 'Leaf' }),
    ).not.toBeInTheDocument();
  });
});
