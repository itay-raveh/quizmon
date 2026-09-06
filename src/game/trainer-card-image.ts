import { site } from '@/app/site';
import type { TrainerView } from './trainer';

const artifactDetails = {
  badges: {
    filename: 'quizmon-league-badge-case.png',
    label: 'League Badge Case',
  },
  front: {
    filename: 'quizmon-trainer-card.png',
    label: 'Trainer Card',
  },
  titles: {
    filename: 'quizmon-trainer-titles.png',
    label: 'Trainer Titles',
  },
} satisfies Record<TrainerView, { filename: string; label: string }>;

const waitForRenderedAssets = async (element: HTMLElement) => {
  await document.fonts?.ready;
  await Promise.allSettled(
    [...element.querySelectorAll('img')].map((image) => image.decode()),
  );
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
};

const createCaptureClone = (element: HTMLElement) => {
  const host = document.createElement('div');
  const clone = element.cloneNode(true) as HTMLElement;
  const width = element.getBoundingClientRect().width;

  host.className = 'trainer-share-capture';
  host.setAttribute('aria-hidden', 'true');
  host.setAttribute('inert', '');
  host.style.width = `${width}px`;
  host.appendChild(clone);
  document.body.appendChild(host);

  return { clone, host };
};

export const renderTrainerArtifactImage = async (
  element: HTMLElement,
): Promise<Blob> => {
  const { clone, host } = createCaptureClone(element);

  try {
    await waitForRenderedAssets(clone);
    const { snapdom } = await import('@zumer/snapdom');

    return await snapdom.toBlob(clone, {
      dpr: 2,
      embedFonts: true,
      outerShadows: true,
      reconcile: true,
      type: 'png',
    });
  } finally {
    host.remove();
  }
};

export const downloadTrainerArtifact = (blob: Blob, view: TrainerView) => {
  const details = artifactDetails[view];
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = details.filename;
  link.click();
  URL.revokeObjectURL(url);
};

export const supportsTrainerArtifactSharing = () => {
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

export const shareTrainerArtifact = async (
  blob: Blob,
  view: TrainerView,
): Promise<'cancelled' | 'shared' | 'unsupported'> => {
  if (!supportsTrainerArtifactSharing()) return 'unsupported';
  const details = artifactDetails[view];
  const file = new File([blob], details.filename, {
    type: 'image/png',
  });

  try {
    await navigator.share({
      files: [file],
      text: `My ${site.name} ${details.label}\n${site.url}`,
      title: `${site.name} ${details.label}`,
    });
    return 'shared';
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return 'cancelled';
    }
    throw error;
  }
};
