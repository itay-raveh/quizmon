interface ProgressProps {
  current: number;
  total: number;
}

export const Progress = ({ current, total }: ProgressProps) => (
  <div
    className="progress"
    role="progressbar"
    aria-label="Quiz progress"
    aria-valuemax={total}
    aria-valuemin={1}
    aria-valuenow={current}
  >
    <span className="progress__label">
      {String(current).padStart(3, '0')} / {String(total).padStart(3, '0')}
    </span>
    <span className="progress__track" aria-hidden="true">
      <span
        className="progress__fill"
        style={{ width: `${(current / total) * 100}%` }}
      />
    </span>
  </div>
);
