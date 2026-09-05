import { render, screen } from '@testing-library/react';
import { TrainerCard } from '@/components/TrainerCard';
import { questionTypes } from '@/game/questions/registry';
import type { TrainerStats } from '@/game/storage';
import type { TrainerProfile } from '@/game/trainer-profile';
import { generations } from '@/game/types';

const profile: TrainerProfile = {
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
  championAnswersWithoutClues: 1,
  correctCategories: { type: 10 },
  correctGenerations: { I: 2, II: 1, III: 1 },
  correctPokemon: ['bulbasaur'],
  correctQuestionTypes: {},
  leagueCompleted: false,
  masteryRounds: 3,
  quickAttackCompleted: false,
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
    expect(
      screen.getByRole('article', { name: 'Trainer Card front' }).className,
    ).not.toContain('trainer-card--accent-');
    expect(container.querySelector('.trainer-card__sheen')).toBeInTheDocument();
  });

  it('adds sourced pixel sparkles only to a Champion card', () => {
    const championStats: TrainerStats = {
      ...stats,
      bestDailyStreak: 7,
      correctCategories: { type: 50 },
      championAnswersWithoutClues: 5,
      correctGenerations: Object.fromEntries(
        generations.map((generation) => [generation, 1]),
      ),
      correctPokemon: Array.from(
        { length: 151 },
        (_, index) => `pokemon-${index}`,
      ),
      correctQuestionTypes: Object.fromEntries(
        questionTypes.slice(0, 10).map((questionType) => [questionType, 1]),
      ),
      leagueCompleted: true,
      quickAttackCompleted: true,
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

  it('renders an interactive eight-slot League Badge Case on the back', () => {
    const onBadgeSelect = vi.fn();
    render(
      <TrainerCard
        face="badges"
        onBadgeSelect={onBadgeSelect}
        partnerDexNumber={null}
        partnerSprite={null}
        profile={profile}
        stats={stats}
      />,
    );

    expect(
      screen.getByRole('article', { name: 'Trainer Card badge case' }),
    ).toBeVisible();
    expect(screen.getByText('League Badge Case')).toBeVisible();
    expect(
      screen.getByRole('region', {
        name: 'League Badge Case: 2 of 8 earned',
      }),
    ).toBeVisible();
    const badge = screen.getByRole('button', {
      name: /Many Paths\. Locked, 0 of 10\. Open badge details/,
    });
    expect(badge).toBeVisible();
    badge.click();
    expect(onBadgeSelect).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'many-paths' }),
    );
    expect(
      screen.queryByRole('heading', { name: 'Leaf' }),
    ).not.toBeInTheDocument();
  });
});
