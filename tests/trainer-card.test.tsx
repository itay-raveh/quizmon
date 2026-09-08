import { render, screen } from '@testing-library/react';
import { TrainerBadgeCase } from '@/components/TrainerBadgeCase';
import { TrainerCard } from '@/components/TrainerCard';
import { TrainerTitles } from '@/components/TrainerTitles';
import type { TrainerStats } from '@/game/storage';
import { renderTrainerArtifactImage } from '@/game/trainer-card-image';
import type { TrainerProfile } from '@/game/trainer-profile';
import { getTrainerBadges } from '@/game/trainer';

const snapdomToBlob = vi.hoisted(() => vi.fn());

vi.mock('@zumer/snapdom', () => ({
  snapdom: { toBlob: snapdomToBlob },
}));

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

const record = {
  dayCombo: 3,
  pokedexFound: 355,
  pokedexTotal: 1025,
};

describe('Trainer profile artifacts', () => {
  beforeEach(() => {
    snapdomToBlob.mockReset();
  });

  it('renders the selected specialty and earned finish on the front', () => {
    const { container } = render(
      <TrainerCard
        partnerDexNumber={1}
        partnerSprite="/sprites/pokemon/1.png"
        profile={profile}
        record={record}
        rank="Ace"
      />,
    );

    expect(screen.getByRole('heading', { name: 'Leaf' })).toBeVisible();
    expect(screen.getByText('Type Specialist')).toBeVisible();
    expect(
      container.querySelector('.trainer-card__title .trainer-title-mark'),
    ).toBeVisible();
    expect(screen.getByText('Ace')).toBeVisible();
    expect(screen.getByText('Pokémon found').parentElement).toHaveTextContent(
      '355 / 1025',
    );
    expect(screen.getByRole('img', { name: '3-day Daily Combo' })).toHaveClass(
      'catch-combo',
    );
    for (const label of ['Name', 'Correct answers', 'Daily clears']) {
      expect(
        screen.queryByText(label, { exact: true }),
      ).not.toBeInTheDocument();
    }
    expect(
      screen.queryByRole('list', { name: 'League Badges' }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/^Badges/)).not.toBeInTheDocument();
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

  it('adds a polished finish and trophy to a Champion card', () => {
    const { container } = render(
      <TrainerCard
        partnerDexNumber={1}
        partnerSprite="/sprites/pokemon/1.png"
        profile={profile}
        record={record}
        rank="Champion"
      />,
    );

    expect(screen.getByText('Champion')).toBeVisible();
    expect(screen.getByRole('article', { name: 'Trainer Card' })).toHaveClass(
      'trainer-card--gold',
    );
    expect(
      container.querySelector('.trainer-card__polish'),
    ).toBeInTheDocument();
    expect(container.querySelector('.trophy')).toBeInTheDocument();
    expect(
      container.querySelector('.trainer-card__sheen'),
    ).not.toBeInTheDocument();
  });

  it('renders a standalone, interactive League Badge Case', () => {
    const onBadgeSelect = vi.fn();
    const badges = getTrainerBadges(stats);
    render(<TrainerBadgeCase badges={badges} onSelect={onBadgeSelect} />);

    expect(
      screen.getByRole('article', { name: 'League Badge Case' }),
    ).toBeVisible();
    expect(screen.queryByText('League Badge Case')).not.toBeInTheDocument();
    expect(screen.queryByText('Play at')).not.toBeInTheDocument();
    expect(screen.queryByText('quizmon.raveh.dev')).not.toBeInTheDocument();
    expect(
      screen.getByRole('region', {
        name: `2 of ${badges.length} League Badges earned`,
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

  it('captures a detached copy of the selected artifact', async () => {
    const blob = new Blob(['trainer'], { type: 'image/png' });
    render(<TrainerTitles equipped="type" onSelect={vi.fn()} stats={stats} />);
    const artifact = screen.getByRole('article', {
      name: 'Trainer Titles collection',
    });
    snapdomToBlob.mockImplementation((capture: HTMLElement) => {
      expect(capture).not.toBe(artifact);
      expect(capture.textContent).not.toContain('Play at');
      expect(capture.textContent).not.toContain('quizmon.raveh.dev');
      expect(capture.parentElement).toHaveClass('trainer-share-capture');
      return Promise.resolve(blob);
    });

    await expect(renderTrainerArtifactImage(artifact)).resolves.toBe(blob);
    expect(document.querySelector('.trainer-share-capture')).toBeNull();
  });
});
