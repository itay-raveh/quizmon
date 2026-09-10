import type { CSSProperties } from 'react';
import {
  trainerTierLabels,
  type TrainerProgressChange,
  type TrainerView,
} from '@/game/trainer';
import { useInteractionSound } from '@/audio/sound';
import { CaretRightIcon } from './icons';
import { Trophy } from './Trophy';
import { TrainerBadgeMark } from './TrainerBadgeMark';
import { TrainerTitleMark } from './TrainerTitleMark';
import { useRewardSequence } from './use-reward-sequence';

interface TrainerProgressSummaryProps {
  leagueVictory: boolean;
  onOpenHallOfFame: () => void;
  onOpenTrainerCard: (view: TrainerView) => void;
  progressChanges: TrainerProgressChange[];
}

const format = (value: number) => Math.round(value).toLocaleString();

export const TrainerProgressSummary = ({
  leagueVictory,
  onOpenTrainerCard,
  onOpenHallOfFame,
  progressChanges,
}: TrainerProgressSummaryProps) => {
  const { elapsed, starts } = useRewardSequence(progressChanges);
  const playInteractionSound = useInteractionSound();
  if (!leagueVictory && progressChanges.length === 0) return null;

  return (
    <section
      className="reward-case"
      aria-label="Trainer progress"
      data-playing={Number.isFinite(elapsed)}
    >
      <ul aria-label="Rewards">
        {leagueVictory ? (
          <li>
            <button
              className="reward reward--victory"
              onClick={() => {
                playInteractionSound('tap');
                onOpenHallOfFame();
              }}
            >
              <Trophy className="reward__hall-mark" />
              <span className="reward__body">
                <strong className="reward__name">Hall of Fame</strong>
                <small>League Champion · Open Hall of Fame</small>
              </span>
              <CaretRightIcon aria-hidden="true" />
            </button>
          </li>
        ) : null}
        {progressChanges.map((change, index) => {
          const local = elapsed - starts[index]!;
          const celebrating = change.earned;
          const revealed = local >= (celebrating ? 500 : 620);
          const before = change.current - change.delta;
          const progress = Math.max(0, Math.min(1, local / 620));
          const credited = celebrating
            ? local < 500
              ? Math.max(
                  0,
                  Math.min(
                    change.delta - 1,
                    (change.goal - 1 - before) *
                      Math.min(1, Math.max(0, local / 230)),
                  ),
                )
              : change.delta
            : change.delta * (1 - (1 - progress) ** 2);
          const current = before + credited;
          const tier =
            change.earned && !revealed ? change.previousTier : change.tier;
          const unlocked = change.earned && revealed;
          const total =
            change.tier === 3
              ? `${format(change.current)} total`
              : `${format(change.current)} / ${format(change.goal)}`;
          const unlockLabel = `${trainerTierLabels[change.tier]} unlocked`;
          const destination =
            change.kind === 'badge' ? 'badge case' : 'Trainer Titles';
          return (
            <li
              key={`${change.kind}-${change.kind === 'badge' ? change.id : change.specialty}`}
            >
              <button
                className="reward"
                data-tier={tier}
                data-tier-unlock={celebrating}
                data-unlocked={unlocked}
                style={
                  { '--reward-delay': `${starts[index]}ms` } as CSSProperties
                }
                aria-label={`${change.label}: +${change.delta}, ${total}${change.earned ? `, ${unlockLabel}` : ''}. Open ${destination}`}
                onClick={() => {
                  playInteractionSound('tap');
                  onOpenTrainerCard(
                    change.kind === 'badge' ? 'badges' : 'titles',
                  );
                }}
              >
                <span className="reward__art" aria-hidden="true">
                  {change.kind === 'badge' ? (
                    <TrainerBadgeMark tier={tier} id={change.id} />
                  ) : (
                    <TrainerTitleMark
                      tier={tier}
                      specialty={change.specialty}
                    />
                  )}
                </span>
                <span className="reward__body" aria-hidden="true">
                  <strong className="reward__name">{change.label}</strong>
                  <span className="reward__progress">
                    <span className="reward__track">
                      <span
                        style={{
                          transform: `scaleX(${Math.max(0, Math.min(current / change.goal, 1))})`,
                        }}
                      />
                    </span>
                    <small className={unlocked ? 'is-unlocked' : undefined}>
                      {unlocked
                        ? unlockLabel
                        : change.tier === 3
                          ? `${format(current)} total`
                          : `${format(current)} / ${format(change.goal)}`}
                    </small>
                  </span>
                </span>
                <b className="reward__gain" aria-hidden="true">
                  +{format(credited)}
                </b>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
};
