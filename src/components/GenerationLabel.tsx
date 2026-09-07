import type { Generation } from '@/game/types';

interface GenerationLabelProps {
  generation: Generation;
  variant?: 'inline' | 'stacked' | 'numeral';
  suffix?: string;
}

export const GenerationLabel = ({
  generation,
  variant = 'inline',
  suffix,
}: GenerationLabelProps) => (
  <span className={`generation-label generation-label--${variant}`}>
    {variant !== 'numeral' && <span>Generation </span>}
    <span className="generation-label__value">
      <span className="generation-label__number">{generation}</span>
      {suffix && <> {suffix}</>}
    </span>
  </span>
);
