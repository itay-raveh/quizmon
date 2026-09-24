import { formatTypeMultiplier } from '@/domain/pokemon/format';

export const RelationArrow = ({
  direction = 'right',
}: {
  direction?: 'right' | 'up' | 'down';
}) => (
  <span
    className={`question-relation__arrow question-relation__arrow--${direction}`}
  >
    <svg aria-hidden="true" viewBox="0 0 54 32">
      <path d="M2 11h31V4l18 12-18 12v-7H2z" />
    </svg>
  </span>
);

export const TypeEffectArrow = ({ multiplier }: { multiplier: number }) => (
  <span className="question-relation__effect">
    <strong>×{formatTypeMultiplier(multiplier)}</strong>
    <RelationArrow />
  </span>
);
