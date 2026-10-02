import * as styles from './styles/classes.css.ts';
import { CheckIcon } from '@/components/icons';
import { SoundButton } from '@/components/SoundButton';
import {
  getTrainerTitles,
  trainerTierLabels,
  trainerViewLabels,
  type TrainerSpecialty,
  type TrainerTitle,
} from '@/domain/player/trainer-progression';
import type { TrainerStats } from '../../domain/player/progress';
import { CollectionCorners } from './CollectionCorners';
import { TrainerTitleMark } from './TrainerTitleMark';

interface TrainerTitlesProps {
  equipped: TrainerSpecialty | null;
  onSelect: (title: TrainerTitle) => void;
  stats: TrainerStats;
}

export const TrainerTitles = ({
  equipped,
  onSelect,
  stats,
}: TrainerTitlesProps) => {
  const titles = getTrainerTitles(stats, equipped);
  const earnedCount = titles.filter(({ earned }) => earned).length;

  return (
    <article
      aria-label={`${trainerViewLabels.titles} collection`}
      className={styles.trainerTitles}
    >
      <CollectionCorners kind="titles" />
      <section
        aria-label={`${earnedCount} of ${titles.length} Trainer Titles earned`}
        className={styles.trainerTitlesCollection}
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
              ? title.current.toLocaleString()
              : `${progress.toLocaleString()} / ${title.goal.toLocaleString()}`;

          return (
            <SoundButton
              aria-label={`${title.label}. ${progressLabel}. ${state}.${title.earned ? ` ${trainerTierLabels[title.tier]} tier ${title.tier}.` : ''} Open title details.`}
              className={styles.trainerTitle}
              data-equipped={title.equipped}
              data-tier={title.tier}
              key={title.specialty}
              onClick={() => onSelect(title)}
            >
              <TrainerTitleMark tier={title.tier} specialty={title.specialty} />
              <span className={styles.trainerTitleCopy}>
                <strong>
                  {title.label}
                  {title.equipped ? (
                    <CheckIcon
                      aria-label="Equipped"
                      className={styles.trainerTitleEquipped}
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
