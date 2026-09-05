import { render, screen } from '@testing-library/react';
import { TrainerBadgeCase } from '@/components/TrainerBadgeCase';
import { TrainerCard } from '@/components/TrainerCard';
import { questionTypes } from '@/game/questions/registry';
import type { TrainerStats } from '@/game/storage';
import type { TrainerProfile } from '@/game/trainer-profile';
import { getTrainerBadges } from '@/game/trainer';
import { generations } from '@/game/types';

const profile: TrainerProfile = {
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

describe('Trainer profile artifacts', () => {
  it('renders the selected specialty and earned finish on the front', () => {
    const { container } = render(
      <TrainerCard
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
      container.querySelector('.trainer-card__partner-caption'),
    ).toHaveTextContent('No. 0001Bulbasaur');
    expect(screen.getByRole('article', { name: 'Trainer Card' })).toHaveClass(
      'trainer-card--bronze',
    );
    expect(
      screen.getByRole('article', { name: 'Trainer Card' }).className,
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
        partnerDexNumber={1}
        partnerSprite="/sprites/pokemon/1.png"
        profile={profile}
        stats={championStats}
      />,
    );

    expect(screen.getByText('Champion')).toBeVisible();
    expect(screen.getByRole('article', { name: 'Trainer Card' })).toHaveClass(
      'trainer-card--gold',
    );
    expect(container.querySelectorAll('.trainer-card__sparkle')).toHaveLength(
      3,
    );
  });

  it('renders a standalone, interactive eight-slot League Badge Case', () => {
    const onBadgeSelect = vi.fn();
    render(
      <TrainerBadgeCase
        badges={getTrainerBadges(stats)}
        onSelect={onBadgeSelect}
      />,
    );

    expect(
      screen.getByRole('article', { name: 'League Badge Case' }),
    ).toBeVisible();
    expect(screen.queryByText('League Badge Case')).not.toBeInTheDocument();
    expect(screen.getByText('Play at')).toBeVisible();
    expect(screen.getByText('quizmon.raveh.dev')).toBeVisible();
    expect(
      screen.getByRole('region', {
        name: '2 of 8 League Badges earned',
      }),
    ).toBeVisible();
    const badge = screen.getByRole('button', {
      name: /Many Paths\. Locked, 0 of 10\. Open badge details/,
    });
    expect(badge).toBeVisible();
    expect(badge).toHaveTextContent('');
    badge.click();
    expect(onBadgeSelect).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'many-paths' }),
    );
    expect(
      screen.queryByRole('heading', { name: 'Leaf' }),
    ).not.toBeInTheDocument();
  });
});
