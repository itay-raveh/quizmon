import { site } from '@/app/site';
import { formatDailyDate } from './daily';
import { formatPokemonName } from './format';
import type { TrainerProfile, TrainerStats } from './storage';
import {
  getCardFinish,
  getTrainerRank,
  getTrainerStamps,
  trainerCategoryLabels,
  type TrainerCardFace,
} from './trainer';

interface TrainerCardImageOptions {
  face: TrainerCardFace;
  partnerSprite: string | null;
  profile: TrainerProfile;
  stats: TrainerStats;
}

const palette = {
  blue: '#0d6be6',
  cream: '#feec99',
  ink: '#143149',
  navy: '#083b7e',
  paper: '#fffbea',
  yellow: '#eed23e',
};

const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Partner sprite could not load'));
    image.src = src;
  });

const drawLabel = (
  context: CanvasRenderingContext2D,
  label: string,
  value: string,
  x: number,
  y: number,
) => {
  context.fillStyle = palette.ink;
  context.font = '700 22px "Gabarito Variable", sans-serif';
  context.fillText(label.toUpperCase(), x, y);
  context.fillStyle = palette.navy;
  context.font = '800 34px "Martian Mono Variable", monospace';
  context.fillText(value, x, y + 44);
};

const drawStamp = (
  context: CanvasRenderingContext2D,
  symbol: string,
  label: string,
  x: number,
  y: number,
) => {
  context.fillStyle = palette.cream;
  context.strokeStyle = palette.navy;
  context.lineWidth = 6;
  context.beginPath();
  context.arc(x + 54, y + 54, 50, 0, Math.PI * 2);
  context.fill();
  context.stroke();
  context.fillStyle = palette.blue;
  context.font = '800 28px "Martian Mono Variable", monospace';
  context.textAlign = 'center';
  context.fillText(symbol, x + 54, y + 64);
  context.fillStyle = palette.navy;
  context.font = '800 20px "Gabarito Variable", sans-serif';
  context.fillText(label, x + 54, y + 130, 150);
  context.textAlign = 'left';
};

export const renderTrainerCardImage = async ({
  face,
  partnerSprite,
  profile,
  stats,
}: TrainerCardImageOptions): Promise<Blob> => {
  await document.fonts?.ready;
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 756;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas is unavailable');

  const rank = getTrainerRank(stats);
  const finish = getCardFinish(rank);
  context.imageSmoothingEnabled = false;
  context.fillStyle = palette.navy;
  context.fillRect(20, 28, 1160, 708);
  context.fillStyle = palette.yellow;
  context.fillRect(32, 16, 1136, 708);
  context.fillStyle = palette.paper;
  context.fillRect(44, 28, 1112, 680);
  context.fillStyle = palette.blue;
  context.fillRect(44, 28, 1112, 108);
  context.fillStyle = palette.paper;
  context.font = '900 42px "Gabarito Variable", sans-serif';
  context.fillText(
    face === 'front' ? 'QUIZMON LEAGUE' : 'TRAINER RECORDS',
    80,
    96,
  );
  context.font = '800 26px "Martian Mono Variable", monospace';
  context.textAlign = 'right';
  context.fillText(face === 'front' ? rank : profile.cardNumber, 1120, 94);
  context.textAlign = 'left';

  if (face === 'front') {
    context.fillStyle = palette.cream;
    context.fillRect(80, 178, 390, 390);
    context.strokeStyle = palette.navy;
    context.lineWidth = 7;
    context.strokeRect(80, 178, 390, 390);

    if (partnerSprite) {
      try {
        const sprite = await loadImage(partnerSprite);
        context.drawImage(sprite, 115, 213, 320, 320);
      } catch {
        context.fillStyle = palette.navy;
        context.font = '900 190px "Gabarito Variable", sans-serif';
        context.textAlign = 'center';
        context.fillText('?', 275, 430);
        context.textAlign = 'left';
      }
    } else {
      context.fillStyle = palette.navy;
      context.font = '900 190px "Gabarito Variable", sans-serif';
      context.textAlign = 'center';
      context.fillText('?', 275, 430);
      context.textAlign = 'left';
    }

    context.fillStyle = palette.ink;
    context.font = '800 24px "Gabarito Variable", sans-serif';
    context.fillText('TRAINER', 525, 205);
    context.fillStyle = palette.navy;
    context.font = '900 60px "Gabarito Variable", sans-serif';
    context.fillText(profile.name || 'Quizmon Trainer', 525, 270, 560);
    drawLabel(context, 'Card No.', profile.cardNumber, 525, 345);
    drawLabel(
      context,
      'Trainer since',
      formatDailyDate(profile.createdAt),
      525,
      445,
    );
    drawLabel(
      context,
      'Partner',
      profile.partnerPokemon
        ? formatPokemonName(profile.partnerPokemon)
        : 'Choose a partner',
      525,
      545,
    );
    context.fillStyle = palette.navy;
    context.font = '800 22px "Martian Mono Variable", monospace';
    context.fillText(`${finish.toUpperCase()} FINISH`, 80, 665);
    context.textAlign = 'right';
    context.fillText('QUIZMON.RAVEH.DEV', 1120, 665);
  } else {
    drawLabel(context, 'Games', stats.gamesCompleted.toLocaleString(), 85, 215);
    drawLabel(
      context,
      'Daily clears',
      stats.dailyChallengesCompleted.toLocaleString(),
      345,
      215,
    );
    drawLabel(
      context,
      'Perfect rounds',
      stats.perfectRounds.toLocaleString(),
      675,
      215,
    );
    drawLabel(
      context,
      'Best combo',
      stats.bestDailyStreak.toLocaleString(),
      970,
      215,
    );
    context.fillStyle = palette.cream;
    context.fillRect(80, 320, 1040, 100);
    context.fillStyle = palette.ink;
    context.font = '800 22px "Gabarito Variable", sans-serif';
    context.fillText('SPECIALTY', 110, 360);
    context.fillStyle = palette.navy;
    context.font = '900 34px "Gabarito Variable", sans-serif';
    context.fillText(
      stats.specialty
        ? trainerCategoryLabels[stats.specialty.category]
        : 'Field research underway',
      110,
      400,
    );

    const stamps = getTrainerStamps(stats).slice(0, 4);
    if (stamps.length > 0) {
      stamps.forEach((stamp, index) =>
        drawStamp(context, stamp.symbol, stamp.label, 115 + index * 255, 475),
      );
    } else {
      context.fillStyle = palette.ink;
      context.font = '700 30px "Gabarito Variable", sans-serif';
      context.fillText('Complete a game to earn your first stamp.', 80, 525);
    }
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Trainer Card image could not be created'));
    }, 'image/png');
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

export const shareTrainerCard = async (
  blob: Blob,
  face: TrainerCardFace,
): Promise<'cancelled' | 'shared' | 'unsupported'> => {
  if (!navigator.share || !navigator.canShare) return 'unsupported';
  const file = new File([blob], `quizmon-trainer-card-${face}.png`, {
    type: 'image/png',
  });
  if (!navigator.canShare({ files: [file] })) return 'unsupported';

  try {
    await navigator.share({
      files: [file],
      text: 'My Quizmon Trainer Card',
      title: 'Quizmon Trainer Card',
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
