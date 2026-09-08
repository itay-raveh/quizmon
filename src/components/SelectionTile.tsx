import { useId, type InputHTMLAttributes, type ReactNode } from 'react';
import { useToggleSound } from '@/audio/sound';
import { CheckIcon } from './icons';

interface SelectionTileProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'type'
> {
  inputType?: 'checkbox' | 'radio';
  label: ReactNode;
  description?: ReactNode;
  variant?: 'experience' | 'generation' | 'question-type' | 'training-mode';
}

export const SelectionTile = ({
  checked,
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
        checked={checked}
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
