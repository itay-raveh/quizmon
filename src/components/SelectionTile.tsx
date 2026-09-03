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
  label: ReactNode;
  description?: ReactNode;
  variant?: 'generation' | 'question-type';
}

export const SelectionTile = ({
  checked,
  description,
  label,
  onChange,
  variant = 'question-type',
  ...props
}: SelectionTileProps) => {
  const { playDown, playOff, playOn } = useGameSounds();
  const id = useId();

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) playOn();
    else playOff();
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
        onPointerDown={() => playDown()}
        type="checkbox"
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
