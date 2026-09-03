import {
  useId,
  type ChangeEvent,
  type InputHTMLAttributes,
  type ReactNode,
} from 'react';
import { useGameSounds } from '@/audio/sound';

interface SelectionTileProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'type'
> {
  inputType?: 'checkbox' | 'radio';
  label: ReactNode;
  description?: ReactNode;
  variant?: 'generation' | 'question-type' | 'round-length';
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
  const { playToggleOff, playToggleOn } = useGameSounds();
  const id = useId();

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) playToggleOn();
    else playToggleOff();
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
        <span className="selection-tile__check" aria-hidden="true" />
      </span>
    </label>
  );
};
