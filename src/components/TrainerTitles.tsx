/*
THESIS: Trainer Titles are a visible collection to pursue and display, not a settings option hidden in a form.
OWN-WORLD: One cream league board uses cobalt plates, navy structure, yellow depth, and compact mono progress.
STORY: See every title, understand the next unlock, equip an earned title, then share the complete record.
FIRST VIEWPORT: A current-title strip leads into all eight titles in a dense two-column collection.
FORM: The approved Collection Board keeps the whole collection visible and makes the board itself the artifact.
*/
import type { Ref } from 'react';
import { siteHostname } from '@/app/site';
import type { TrainerStats } from '@/game/storage';
import { getTrainerTitles, type TrainerSpecialty } from '@/game/trainer';
import { TrainerTitleMark } from './TrainerTitleMark';

interface TrainerTitlesProps {
  collectionRef?: Ref<HTMLElement>;
  equipped: TrainerSpecialty | null;
  onEquip: (specialty: TrainerSpecialty) => void;
  stats: TrainerStats;
}

export const TrainerTitles = ({
  collectionRef,
  equipped,
  onEquip,
  stats,
}: TrainerTitlesProps) => {
  const titles = getTrainerTitles(stats, equipped);
  const earnedCount = titles.filter(({ earned }) => earned).length;
  const currentTitle = titles.find(({ equipped: isEquipped }) => isEquipped);

  return (
    <article
      ref={collectionRef}
      aria-label="Trainer Titles collection"
      className="trainer-titles"
    >
      <header className="trainer-titles__banner">
        <span>Trainer Titles</span>
        <strong>
          {earnedCount} / {titles.length} earned
        </strong>
      </header>

      <section
        aria-label="Current Trainer title"
        className="trainer-titles__current"
      >
        {currentTitle ? (
          <>
            <TrainerTitleMark earned specialty={currentTitle.specialty} />
            <span>
              <small>Current title</small>
              <strong>{currentTitle.label}</strong>
            </span>
            <span className="trainer-titles__lifetime">
              <strong>{currentTitle.current.toLocaleString()}</strong>
              <small>lifetime correct</small>
            </span>
          </>
        ) : (
          <span className="trainer-titles__empty">
            <small>Current title</small>
            <strong>No title equipped</strong>
            <span>
              {earnedCount > 0
                ? 'Choose an earned title below.'
                : 'Earn 10 correct answers in a field to unlock one.'}
            </span>
          </span>
        )}
      </section>

      <section
        aria-label={`${earnedCount} of ${titles.length} Trainer Titles earned`}
        className="trainer-titles__collection"
      >
        {titles.map((title) => {
          const progress = Math.min(title.current, title.goal);
          const state = title.equipped
            ? 'Equipped'
            : title.earned
              ? 'Equip'
              : 'Locked';
          const progressLabel = title.earned
            ? `${title.current.toLocaleString()} lifetime correct`
            : `${progress} / ${title.goal} correct`;

          return (
            <button
              aria-label={`${title.label}. ${progressLabel}. ${state}.`}
              aria-pressed={title.equipped}
              className="trainer-title"
              data-earned={title.earned}
              data-equipped={title.equipped}
              disabled={!title.earned}
              key={title.specialty}
              onClick={() => {
                if (title.earned) onEquip(title.specialty);
              }}
              type="button"
            >
              <TrainerTitleMark
                earned={title.earned}
                specialty={title.specialty}
              />
              <span className="trainer-title__copy">
                <strong>{title.label}</strong>
                <small>{progressLabel}</small>
                <span className="trainer-title__track" aria-hidden="true">
                  <span
                    style={{ width: `${(progress / title.goal) * 100}%` }}
                  />
                </span>
              </span>
              <span className="trainer-title__state">{state}</span>
            </button>
          );
        })}
      </section>

      <footer className="trainer-titles__footer">
        <span>Play at</span>
        <strong>{siteHostname}</strong>
      </footer>
    </article>
  );
};
