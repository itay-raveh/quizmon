import { CollectionCorners } from './CollectionCorners';
import type { Ref } from 'react';
import type { TrainerStats } from '@/game/storage';
import {
  getTrainerTitles,
  type TrainerSpecialty,
  type TrainerTitle,
} from '@/game/trainer';
import { SoundButton } from './SoundButton';
import { TrainerTitleMark } from './TrainerTitleMark';

interface TrainerTitlesProps {
  collectionRef?: Ref<HTMLElement>;
  equipped: TrainerSpecialty | null;
  onSelect: (title: TrainerTitle) => void;
  stats: TrainerStats;
}

export const TrainerTitles = ({
  collectionRef,
  equipped,
  onSelect,
  stats,
}: TrainerTitlesProps) => {
  const titles = getTrainerTitles(stats, equipped);
  const earnedCount = titles.filter(({ earned }) => earned).length;

  return (
    <article
      ref={collectionRef}
      aria-label="Trainer Titles collection"
      className="trainer-titles"
    >
      <CollectionCorners className="trainer-titles__fastener" />
      <section
        aria-label={`${earnedCount} of ${titles.length} Trainer Titles earned`}
        className="trainer-titles__collection"
      >
        {titles.map((title) => {
          const progress = Math.min(title.current, title.goal);
          const state = title.equipped
            ? 'Equipped'
            : title.earned
              ? 'Earned'
              : 'Locked';
          const progressLabel = title.earned
            ? `${title.current.toLocaleString()} correct`
            : `${progress} / ${title.goal} correct`;

          return (
            <SoundButton
              aria-label={`${title.label}. ${progressLabel}. ${state}. Open title details.`}
              className="trainer-title"
              data-equipped={title.equipped}
              key={title.specialty}
              onClick={() => onSelect(title)}
            >
              <TrainerTitleMark
                earned={title.earned}
                specialty={title.specialty}
              />
              <span className="trainer-title__copy">
                <strong>{title.label}</strong>
                <small>{progressLabel}</small>
              </span>
            </SoundButton>
          );
        })}
      </section>
    </article>
  );
};
