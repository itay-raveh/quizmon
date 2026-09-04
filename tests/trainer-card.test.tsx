import { render, screen } from '@testing-library/react';
import { TrainerCard } from '@/components/TrainerCard';
import { questionTypes } from '@/game/questions/registry';
import type { TrainerStats } from '@/game/storage';
import type { TrainerProfile } from '@/game/trainer-profile';
import { generations } from '@/game/types';

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
  it('renders the selected specialty and earned finish on the front', () => {
    const { container } = render(
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
    expect(screen.getByText('Ace')).toBeVisible();
    expect(
      screen.getByRole('article', { name: 'Trainer Card front' }),
    ).toHaveClass('trainer-card--bronze');
    expect(container.querySelector('.trainer-card__sheen')).toBeInTheDocument();
  });

  it('adds sourced pixel sparkles only to a Champion card', () => {
    const championStats: TrainerStats = {
      ...stats,
      championAnswersWithoutClues: 5,
      correctGenerations: Object.fromEntries(
        generations.map((generation) => [generation, 1]),
      ),
      correctQuestionTypes: Object.fromEntries(
        questionTypes.slice(0, 10).map((questionType) => [questionType, 1]),
      ),
    };
    const { container } = render(
      <TrainerCard
        face="front"
        partnerDexNumber={1}
        partnerSprite="/sprites/pokemon/1.png"
        profile={profile}
        stats={championStats}
      />,
    );

    expect(screen.getByText('Champion')).toBeVisible();
    expect(
      screen.getByRole('article', { name: 'Trainer Card front' }),
    ).toHaveClass('trainer-card--gold');
    expect(container.querySelectorAll('.trainer-card__sparkle')).toHaveLength(
      3,
    );
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
