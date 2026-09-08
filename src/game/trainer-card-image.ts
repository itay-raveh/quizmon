import { site } from '@/app/site';
import { shareContent } from './share';
import { trainerViewLabels, type TrainerView } from './trainer';

type TrainerArtifactView = Exclude<TrainerView, 'pokedex'> | 'hall';

const artifactDetails = {
  hall: { filename: 'quizmon-hall-of-fame.png', label: 'Hall of Fame' },
  badges: {
    filename: 'quizmon-league-badge-case.png',
    label: trainerViewLabels.badges,
  },
  front: {
    filename: 'quizmon-trainer-card.png',
    label: trainerViewLabels.front,
  },
  titles: {
    filename: 'quizmon-trainer-titles.png',
    label: trainerViewLabels.titles,
  },
} satisfies Record<TrainerArtifactView, { filename: string; label: string }>;

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
  clone.querySelectorAll('.trainer-card__finish-effects').forEach((effects) => {
    effects.classList.remove('is-motion-active');
    effects.classList.add('is-static');
    const sheen = effects.querySelector<HTMLImageElement>(
      '.trainer-card__sheen',
    );
    if (sheen?.dataset.staticSrc) {
      sheen.src = sheen.dataset.staticSrc;
      sheen.classList.add('is-active');
    }
  });

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
      compress: true,
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

export const downloadTrainerArtifact = (
  blob: Blob,
  view: TrainerArtifactView,
) => {
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
      files: [
        new File([], artifactDetails.front.filename, { type: 'image/png' }),
      ],
    });
  } catch {
    return false;
  }
};

export const shareTrainerArtifact = async (
  blob: Blob,
  view: TrainerArtifactView,
): Promise<'cancelled' | 'shared' | 'unsupported'> => {
  if (!supportsTrainerArtifactSharing()) return 'unsupported';
  const details = artifactDetails[view];
  const file = new File([blob], details.filename, {
    type: 'image/png',
  });

  return shareContent({
    files: [file],
    text: `My ${site.name} ${details.label}\n${site.url}`,
    title: `${site.name} ${details.label}`,
  });
};
