import {
  useId,
  type ChangeEvent,
  type InputHTMLAttributes,
  type ReactNode,
} from 'react';
import { useInteractionSound } from '@/audio/sound';
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
  const playInteractionSound = useInteractionSound();
  const id = useId();

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    playInteractionSound(event.target.checked ? 'toggle-on' : 'toggle-off');
    onChange?.(event);
  };

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
