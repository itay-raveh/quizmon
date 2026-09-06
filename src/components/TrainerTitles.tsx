/*
THESIS: Trainer Titles are a visible collection to pursue and display, not a settings option hidden in a form.
OWN-WORLD: A warm wood display board holds cream title plaques, brass fasteners, and cobalt earned marks.
STORY: See every title and its progress, open one for its meaning, equip an earned title, then share the board.
FIRST VIEWPORT: All eight icon-led title records appear together without repeated headings or status panels.
FORM: The wood board is one physical collection surface, not a table or a dashboard of cards.
*/
import type { Ref } from 'react';
import type { TrainerStats } from '@/game/storage';
import {
  getTrainerTitles,
  type TrainerSpecialty,
  type TrainerTitle,
} from '@/game/trainer';
import { SoundButton } from './SoundButton';
import { TrainerShareAttribution } from './TrainerShareAttribution';
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
      <span
        aria-hidden="true"
        className="trainer-titles__fastener trainer-titles__fastener--top-left"
      />
      <span
        aria-hidden="true"
        className="trainer-titles__fastener trainer-titles__fastener--top-right"
      />
      <span
        aria-hidden="true"
        className="trainer-titles__fastener trainer-titles__fastener--bottom-left"
      />
      <span
        aria-hidden="true"
        className="trainer-titles__fastener trainer-titles__fastener--bottom-right"
      />
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

      <TrainerShareAttribution />
    </article>
  );
};
