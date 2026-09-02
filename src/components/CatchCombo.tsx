interface CatchComboProps {
  celebrate?: boolean;
  className?: string;
  count: number;
}

export const CatchCombo = ({
  celebrate = false,
  className = '',
  count,
}: CatchComboProps) => {
  if (count < 1) return null;

  const displayCount = count > 999 ? '999+' : count.toString();

  return (
    <div
      aria-label={`${count}-day Daily Combo`}
      className={`catch-combo ${celebrate ? 'catch-combo--celebrate' : ''} ${className}`.trim()}
      role="img"
    >
      <span className="catch-combo__ball" aria-hidden="true">
        <span className="catch-combo__ring" />
        <strong data-digits={displayCount.length}>{displayCount}</strong>
      </span>
      <span className="catch-combo__label" aria-hidden="true">
        Day combo
      </span>
    </div>
  );
};
