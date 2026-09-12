import {
  buildShareContent,
  buildShareText,
  canShareResult,
  shareResult,
} from '@/features/sharing/result-sharing';
import { shareTrainerArtifact } from '@/features/trainer/trainer-artifact-export';
import { result } from '../../../tests/fixtures/result';

const mockNativeShare = () => {
  const share = vi
    .fn<(data: ShareData) => Promise<void>>()
    .mockResolvedValue(undefined);
  Object.defineProperties(navigator, {
    share: { configurable: true, value: share },
    canShare: { configurable: true, value: () => true },
  });
  return share;
};

const nativeShares = [
  { name: 'result', run: () => shareResult({ kind: 'training' }, result) },
  {
    name: 'Trainer artifact',
    run: () => shareTrainerArtifact(new Blob(['image']), 'front'),
  },
];

describe('result sharing', () => {
  afterEach(() => {
    for (const property of ['share', 'canShare']) {
      Object.defineProperty(navigator, property, {
        configurable: true,
        value: undefined,
      });
    }
  });

  it('includes the daily date and challenge URL without answer details', () => {
    window.history.replaceState({}, '', '/play?daily=old#answer');
    const text = buildShareText(
      buildShareContent({ kind: 'daily', date: '2026-09-01' }, result),
    );

    expect(text).toContain('Quizmon · Sep 1, 2026');
    expect(text).toContain('1,500 points');
    expect(text).not.toContain(' / ');
    expect(text).not.toContain('1/2');
    expect(text).toContain('🟩🟥');
    expect(text).toContain('https://quizmon.raveh.dev/?daily=2026-09-01');
    expect(text).not.toContain('pikachu');
    expect(text).not.toContain('#answer');
  });

  it.each([
    { mode: { kind: 'training' } as const, title: 'Quizmon · Training' },
    { mode: { kind: 'league' } as const, title: 'Quizmon · Quizmon League' },
  ])('keeps $mode.kind share fields separate', ({ mode, title }) => {
    const content = buildShareContent(mode, result);

    expect(content.title).toBe(title);
    expect(content.text).toContain('1,500 points');
    expect(content.text).not.toContain(content.url);
    expect(content.url).toBe('https://quizmon.raveh.dev/');
  });

  it('includes the dated challenge link in the native share payload', async () => {
    const share = mockNativeShare();

    await expect(
      shareResult({ kind: 'daily', date: '2026-09-01' }, result),
    ).resolves.toBe('shared');
    expect(canShareResult()).toBe(true);
    expect(share).toHaveBeenCalledExactlyOnceWith({
      text: [
        'Quizmon · Sep 1, 2026',
        '1,500 points',
        '🟩🟥',
        'https://quizmon.raveh.dev/?daily=2026-09-01',
      ].join('\n'),
      title: 'Quizmon · Sep 1, 2026',
    });
  });

  it('opens fallback options instead of copying when native sharing is absent', async () => {
    expect(canShareResult()).toBe(false);
    await expect(shareResult({ kind: 'training' }, result)).resolves.toBe(
      'unsupported',
    );
  });
  it.each(nativeShares)(
    '$name sharing returns cancellation for a native AbortError',
    async ({ run }) => {
      mockNativeShare().mockRejectedValue(
        new DOMException('Cancelled', 'AbortError'),
      );
      await expect(run()).resolves.toBe('cancelled');
    },
  );

  it.each(nativeShares)(
    '$name sharing preserves other failures for its caller',
    async ({ run }) => {
      const share = mockNativeShare();
      for (const error of [
        new DOMException('Denied', 'NotAllowedError'),
        Object.assign(new Error('Failed'), { name: 'AbortError' }),
      ]) {
        share.mockRejectedValue(error);
        await expect(run()).rejects.toBe(error);
      }
    },
  );

  it('shares the Trainer image with its existing filename and label', async () => {
    const share = mockNativeShare();
    await expect(
      shareTrainerArtifact(new Blob(['image']), 'front'),
    ).resolves.toBe('shared');
    expect(share).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        files: [
          expect.objectContaining({
            name: 'quizmon-trainer-card.png',
            type: 'image/png',
            size: 5,
          }),
        ],
        title: 'Quizmon Trainer Card',
      }),
    );
  });
});
