import { Progress } from '@base-ui/react/progress';
interface RoundProgressProps {
  current: number;
  total: number;
}

export const RoundProgress = ({ current, total }: RoundProgressProps) => (
  <Progress.Root
    className="progress"
    aria-label="Quiz progress"
    max={total}
    min={1}
    value={current}
    aria-valuetext={`Question ${current} of ${total}`}
  >
    <span className="progress__label">
      {String(current).padStart(2, '0')} / {String(total).padStart(2, '0')}
    </span>
  </Progress.Root>
);
