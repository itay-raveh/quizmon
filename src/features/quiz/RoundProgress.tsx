interface RoundProgressProps {
  current: number;
  total: number;
}

export const RoundProgress = ({ current, total }: RoundProgressProps) => (
  <div
    className="progress"
    role="progressbar"
    aria-label="Quiz progress"
    aria-valuemax={total}
    aria-valuemin={1}
    aria-valuenow={current}
    aria-valuetext={`Question ${current} of ${total}`}
  >
    <span className="progress__label">
      {String(current).padStart(2, '0')} / {String(total).padStart(2, '0')}
    </span>
  </div>
);
