import { useToggleSound } from '@/lib/audio/sound-context';
import { useId, type InputHTMLAttributes, type ReactNode } from 'react';
import { CheckIcon } from './icons';

interface SelectionTileProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'type'
> {
  inputType?: 'checkbox' | 'radio';
  label: ReactNode;
  description?: ReactNode;
  variant?:
    'form' | 'experience' | 'generation' | 'question-type' | 'training-mode';
}

export const SelectionTile = ({
  description,
  inputType = 'checkbox',
  label,
  onChange,
  variant = 'question-type',
  ...props
}: SelectionTileProps) => {
  const handleChange = useToggleSound(onChange);
  const id = useId();

  return (
    <label className={`selection-tile selection-tile--${variant}`}>
      <input
        {...props}
        aria-describedby={description ? `${id}-description` : undefined}
        aria-labelledby={`${id}-label`}
        onChange={handleChange}
        type={inputType}
      />
      <span className="selection-tile__surface">
        <span className="selection-tile__label" id={`${id}-label`}>
          {label}
        </span>
        {description ? (
          <span
            className="selection-tile__description"
            id={`${id}-description`}
          >
            {description}
          </span>
        ) : null}
        <span className="selection-tile__check" aria-hidden="true">
          <CheckIcon weight="bold" />
        </span>
      </span>
    </label>
  );
};
