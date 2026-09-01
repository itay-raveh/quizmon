import type { ChangeEvent, InputHTMLAttributes, ReactNode } from 'react';
import { useGameSounds } from '@/audio/sound';

interface CheckboxProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'type'
> {
  description?: ReactNode;
  label: ReactNode;
}

export const Checkbox = ({
  checked,
  description,
  label,
  onChange,
  ...props
}: CheckboxProps) => {
  const { playDown, playOff, playOn } = useGameSounds();

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) playOn();
    else playOff();
    onChange?.(event);
  };

  return (
    <label className="checkbox">
      <input
        {...props}
        checked={checked}
        onChange={handleChange}
        onPointerDown={() => playDown()}
        type="checkbox"
      />
      <span className="checkbox__control" aria-hidden="true" />
      <span className="checkbox__copy">
        <span className="checkbox__label">{label}</span>
        {description ? (
          <span className="checkbox__description">{description}</span>
        ) : null}
      </span>
    </label>
  );
};
