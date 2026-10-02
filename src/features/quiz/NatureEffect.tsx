import { StatDirection } from './StatDirection';

export const NatureEffect = ({
  description,
  compact = false,
}: {
  description: string;
  compact?: boolean;
}) => {
  const effect = /^Raises (.+); lowers (.+)$/.exec(description);
  if (!effect) return description;
  return (
    <span
      className={`nature-effect${compact ? ' nature-effect--compact' : ''}`}
      aria-label={description}
      role="img"
    >
      <span aria-hidden="true">
        <StatDirection label={effect[1]!} direction="up" compact={compact} />
      </span>
      <span aria-hidden="true">
        <StatDirection label={effect[2]!} direction="down" compact={compact} />
      </span>
    </span>
  );
};
