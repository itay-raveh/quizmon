import { RelationArrow } from './RelationArrow';

export const StatDirection = ({
  label,
  direction,
  compact = false,
}: {
  label: string;
  direction: 'up' | 'down';
  compact?: boolean;
}) => (
  <span
    className={`stat-direction${compact ? ' stat-direction--compact' : ''}`}
  >
    <strong>{label}</strong>
    <RelationArrow direction={direction} />
  </span>
);
