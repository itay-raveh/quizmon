import { renderTrainerArtifactImage } from '@/features/trainer/trainer-artifact-export';
import { TrainerTitles } from '@/features/trainer/TrainerTitles';
import { render, screen } from '@testing-library/react';
import type { TrainerStats } from '../../domain/player/progress';

const snapdomToBlob = vi.hoisted(() => vi.fn());

vi.mock('@zumer/snapdom', () => ({
  snapdom: { toBlob: snapdomToBlob },
}));

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
