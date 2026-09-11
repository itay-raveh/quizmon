import { CheckIcon } from '@/components/icons';
import { SoundButton } from '@/components/SoundButton';
import {
  getTrainerTitles,
  trainerTierLabels,
  trainerViewLabels,
  type TrainerSpecialty,
  type TrainerTitle,
} from '@/domain/player/trainer-progression';
import type { Ref } from 'react';
import type { TrainerStats } from '../../domain/player/progress';
import { CollectionCorners } from './CollectionCorners';
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
      aria-label={`${trainerViewLabels.titles} collection`}
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
          const progressLabel =
            title.tier === 3
              ? `${title.current.toLocaleString()} correct`
              : `${progress.toLocaleString()} / ${title.goal.toLocaleString()} correct`;

          return (
            <SoundButton
              aria-label={`${title.label}. ${progressLabel}. ${state}.${title.earned ? ` ${trainerTierLabels[title.tier]} tier ${title.tier}.` : ''} Open title details.`}
              className="trainer-title"
              data-equipped={title.equipped}
              data-tier={title.tier}
              key={title.specialty}
              onClick={() => onSelect(title)}
            >
              <TrainerTitleMark tier={title.tier} specialty={title.specialty} />
              <span className="trainer-title__copy">
                <strong>
                  {title.label}
                  {title.equipped ? (
                    <CheckIcon
                      aria-label="Equipped"
                      className="trainer-title__equipped"
                      weight="bold"
                    />
                  ) : null}
                </strong>
                <small>{progressLabel}</small>
              </span>
            </SoundButton>
          );
        })}
      </section>
    </article>
  );
};
