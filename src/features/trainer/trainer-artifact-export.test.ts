import { afterEach, expect, test, vi } from 'vitest';
import { exportTrainerArtifact } from './trainer-artifact-export';

afterEach(() => vi.unstubAllGlobals());

test('shares a prepared Trainer Card PNG in the same click', async () => {
  let shared: ShareData | undefined;
  const share = vi.fn((data: ShareData) => {
    shared = data;
    return Promise.resolve();
  });
  vi.stubGlobal('navigator', { canShare: () => true, share });
  const image = new Blob(['png'], { type: 'image/png' });

  const result = exportTrainerArtifact(
    null as unknown as HTMLElement,
    'front',
    {
      attemptShare: true,
      onShareError: 'throw',
      preparedImage: image,
    },
  );

  expect(share).toHaveBeenCalledOnce();
  const file = shared?.files?.[0];
  expect(file).toBeInstanceOf(File);
  expect(file?.name).toBe('quizmon-trainer-card.png');
  expect(file?.size).toBe(image.size);
  await expect(result).resolves.toBe('shared');
});
