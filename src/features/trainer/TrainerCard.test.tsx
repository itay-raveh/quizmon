import { renderTrainerArtifactImage } from '@/features/trainer/trainer-artifact-export';
import { TrainerCard } from '@/features/trainer/TrainerCard';
import { TrainerTitles } from '@/features/trainer/TrainerTitles';
import type { TrainerProfile } from '@/lib/storage/trainer-profile-storage';
import { fireEvent, render, screen } from '@testing-library/react';
import type { TrainerStats } from '../../domain/player/progress';
import type { PackedSpriteMeasurements } from '../../domain/pokemon/types';

const snapdomToBlob = vi.hoisted(() => vi.fn());

vi.mock('@zumer/snapdom', () => ({
  snapdom: { toBlob: snapdomToBlob },
}));

afterEach(() => vi.restoreAllMocks());

const profile: TrainerProfile = {
  avatar: 'leaf-gen3',
  createdAt: '2026-09-03',
  hasBeenRevealed: true,
  name: 'Leaf',
  partnerPokemon: 'bulbasaur',
  specialty: 'type',
};

const record = { dayCombo: 3, pokedexFound: 355, pokedexTotal: 1025 };

const stats: TrainerStats = {
  bestDailyStreak: 7,
  championAnswersWithoutClues: 1,
  correctCategories: {},
  correctGenerations: { I: 2, II: 1, III: 1 },
  correctPokemon: ['bulbasaur'],
  correctQuestionTypes: { 'type-check': 10 },
  leagueCompleted: false,
  masteryRounds: 3,
  quickAttackCompleted: false,
  quickAttackRounds: 0,
};

it('scales and layers the partner by its catalog height', () => {
  const props = {
    partnerDexNumber: 1,
    partnerSprite: '/sprites/pokemon/1.png',
    partnerSpriteMeasurements: [
      0.2, 0.5, 0.5, 0.5, 0.75,
    ] as PackedSpriteMeasurements,
    profile,
    record,
    rank: 'Ace' as const,
  };
  const { container, rerender } = render(
    <TrainerCard {...props} partnerHeight={4} />,
  );
  const sprite = container.querySelector<HTMLImageElement>(
    '.trainer-card__partner-sprite',
  );
  expect(sprite).not.toHaveClass('trainer-card__partner-sprite--behind');
  const smallWidth = Number.parseFloat(sprite?.style.width ?? '0');

  rerender(<TrainerCard {...props} partnerHeight={21} />);
  expect(sprite).toHaveClass('trainer-card__partner-sprite--behind');
  expect(Number.parseFloat(sprite?.style.width ?? '0')).toBeGreaterThan(
    smallWidth,
  );
});

it('aligns the partner with the trainer’s last visible pixel', () => {
  const pixels = new Uint8ClampedArray(80 * 80 * 4);
  pixels[(67 * 80 + 40) * 4 + 3] = 255;
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
    drawImage: vi.fn(),
    getImageData: () => ({ data: pixels }),
  } as unknown as CanvasRenderingContext2D);
  const { container } = render(
    <TrainerCard
      partnerDexNumber={143}
      partnerHeight={21}
      partnerSprite="/sprites/pokemon/143.png"
      partnerSpriteMeasurements={[0.3, 0.65, 0.7, 0.5, 0.85]}
      profile={profile}
      record={record}
      rank="Ace"
    />,
  );
  const avatar = screen.getByRole('img', { name: 'Leaf trainer avatar' });
  Object.defineProperties(avatar, {
    naturalWidth: { value: 80 },
    naturalHeight: { value: 80 },
  });
  fireEvent.load(avatar);
  const sprite = container.querySelector<HTMLImageElement>(
    '.trainer-card__partner-sprite',
  );
  expect(
    Number.parseFloat(sprite?.style.bottom.match(/[\d.]+/)?.[0] ?? '0'),
  ).toBeCloseTo(15);
});

it('captures a detached copy of the selected artifact', async () => {
  snapdomToBlob.mockReset();
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
