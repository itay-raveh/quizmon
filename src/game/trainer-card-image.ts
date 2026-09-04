import { site } from '@/app/site';
import type { TrainerCardFace } from './trainer';

const waitForRenderedAssets = async (element: HTMLElement) => {
  await document.fonts?.ready;
  await Promise.allSettled(
    [...element.querySelectorAll('img')].map((image) => image.decode()),
  );
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
};

export const renderTrainerCardImage = async (
  element: HTMLElement,
): Promise<Blob> => {
  await waitForRenderedAssets(element);
  const { snapdom } = await import('@zumer/snapdom');

  return snapdom.toBlob(element, {
    dpr: 2,
    embedFonts: true,
    outerShadows: true,
    reconcile: true,
    type: 'png',
  });
};

export const downloadTrainerCard = (blob: Blob, face: TrainerCardFace) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `quizmon-trainer-card-${face}.png`;
  link.click();
  URL.revokeObjectURL(url);
};

export const supportsTrainerCardSharing = () => {
  if (!navigator.share || !navigator.canShare || typeof File === 'undefined') {
    return false;
  }

  try {
    return navigator.canShare({
      files: [new File([], 'quizmon-trainer-card.png', { type: 'image/png' })],
    });
  } catch {
    return false;
  }
};

export const shareTrainerCard = async (
  blob: Blob,
  face: TrainerCardFace,
): Promise<'cancelled' | 'shared' | 'unsupported'> => {
  if (!supportsTrainerCardSharing()) return 'unsupported';
  const file = new File([blob], `quizmon-trainer-card-${face}.png`, {
    type: 'image/png',
  });

  try {
    await navigator.share({
      files: [file],
      text: `My ${site.name} Trainer Card`,
      title: `${site.name} Trainer Card`,
      url: site.url,
    });
    return 'shared';
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return 'cancelled';
    }
    throw error;
  }
};
