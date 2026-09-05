/*
THESIS: Trainer Titles are a visible collection to pursue and display, not a settings option hidden in a form.
OWN-WORLD: A warm wood display board holds cream title plaques, brass fasteners, and cobalt earned marks.
STORY: See every title and its progress, open one for its meaning, equip an earned title, then share the board.
FIRST VIEWPORT: A compact current-title plaque leads into all eight icon-led title records.
FORM: The wood board is one physical collection surface, not a table or a dashboard of cards.
*/
import type { Ref } from 'react';
import { siteHostname } from '@/app/site';
import type { TrainerStats } from '@/game/storage';
import {
  getTrainerTitles,
  type TrainerSpecialty,
  type TrainerTitle,
} from '@/game/trainer';
import { CertificateIcon, CheckCircleIcon, LockSimpleIcon } from './icons';
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
  const currentTitle = titles.find(({ equipped: isEquipped }) => isEquipped);

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
      <header className="trainer-titles__banner">
        <span>
          <CertificateIcon aria-hidden="true" weight="bold" />
          Trainer Titles
        </span>
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
              <small>lifetime</small>
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
              ? 'Earned'
              : 'Locked';
          const progressLabel = title.earned
            ? `${title.current.toLocaleString()} lifetime correct`
            : `${progress} / ${title.goal}`;
          const visibleProgressLabel = title.earned
            ? `${title.current.toLocaleString()} lifetime`
            : progressLabel;

          return (
            <button
              aria-label={`${title.label}. ${progressLabel}. ${state}. Open title details.`}
              aria-pressed={title.equipped}
              className="trainer-title"
              data-earned={title.earned}
              data-equipped={title.equipped}
              key={title.specialty}
              onClick={() => onSelect(title)}
              type="button"
            >
              <TrainerTitleMark
                earned={title.earned}
                specialty={title.specialty}
              />
              <span className="trainer-title__copy">
                <strong>{title.label}</strong>
                <small>{visibleProgressLabel}</small>
              </span>
              <span
                aria-hidden="true"
                className="trainer-title__state"
                data-state={title.earned ? 'earned' : 'locked'}
              >
                {title.earned ? (
                  <CheckCircleIcon weight="fill" />
                ) : (
                  <LockSimpleIcon weight="bold" />
                )}
              </span>
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
