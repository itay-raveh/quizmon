import type { TrainerStampId, TrainerStampTier } from '@/game/trainer';

interface TrainerStampMarkProps {
  id: TrainerStampId;
  tier: TrainerStampTier;
}

const StampMotif = ({ id }: Pick<TrainerStampMarkProps, 'id'>) => {
  if (id === 'perfect-form') {
    return <path d="m16 2 4 9h10l-8 6 3 11-9-6-9 6 3-11-8-6h10l4-9Z" />;
  }
  if (id === 'many-paths') {
    return (
      <path d="M3 3h8v8H3V3Zm18 0h8v8h-8V3Zm-9 20h8v8h-8v-8ZM7 11h4v3h10v-3h4v7h-7v5h-4v-5H7v-7Z" />
    );
  }
  if (id === 'world-tour') {
    return (
      <path
        d="m16 3 5 8 8 5-8 5-5 8-5-8-8-5 8-5 5-8Zm0 8-2 5 2 5 2-5-2-5Z"
        fillRule="evenodd"
      />
    );
  }
  if (id === 'champions-instinct') {
    return (
      <path
        d="M2 16 8 9h16l6 7-6 7H8l-6-7Zm8 0a6 6 0 1 0 12 0 6 6 0 0 0-12 0Zm4 0a2 2 0 1 1 4 0 2 2 0 0 1-4 0Z"
        fillRule="evenodd"
      />
    );
  }
  return (
    <path
      d="M5 5h22v22H5V5Zm4 7h14v11H9V12Zm2-5h3v4h-3V7Zm7 0h3v4h-3V7Zm-6 8h3v3h-3v-3Zm5 0h3v3h-3v-3Z"
      fillRule="evenodd"
    />
  );
};

export const TrainerStampMark = ({ id, tier }: TrainerStampMarkProps) => (
  <span className="trainer-stamp-mark" data-tier={tier}>
    <svg aria-hidden="true" shapeRendering="crispEdges" viewBox="0 0 32 32">
      <StampMotif id={id} />
    </svg>
    <span className="trainer-stamp-mark__tiers" aria-hidden="true">
      {[1, 2, 3].map((level) => (
        <span
          className={level <= tier ? 'trainer-stamp-mark__tier--earned' : ''}
          key={level}
        />
      ))}
    </span>
  </span>
);
