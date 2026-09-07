import type { Generation } from '@/game/types';

interface GenerationLabelProps {
  abbreviated?: boolean;
  generation: Generation;
  variant?: 'inline' | 'stacked' | 'numeral';
  suffix?: string;
}

export const GenerationLabel = ({
  abbreviated = true,
  generation,
  variant = 'inline',
  suffix,
}: GenerationLabelProps) => (
  <span className={`generation-label generation-label--${variant}`}>
    {variant !== 'numeral' && (
      <>
        <span>
          <span aria-hidden={abbreviated || undefined}>
            {abbreviated ? 'Gen' : 'Generation'}
          </span>
          {abbreviated && <span className="visually-hidden">Generation</span>}
        </span>{' '}
      </>
    )}
    <span className="generation-label__number">{generation}</span>
    {suffix && (
      <>
        {' '}
        <span>{suffix}</span>
      </>
    )}
  </span>
);
