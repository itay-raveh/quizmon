import type { ChangeEvent, InputHTMLAttributes, ReactNode } from 'react';
import { useInteractionSound } from '@/audio/sound';
import { CheckIcon } from './icons';

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
  const playInteractionSound = useInteractionSound();

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    playInteractionSound(event.target.checked ? 'toggle-on' : 'toggle-off');
    onChange?.(event);
  };

  return (
    <label className="checkbox">
      <input
        {...props}
        checked={checked}
        onChange={handleChange}
        type="checkbox"
      />
      <span className="checkbox__control" aria-hidden="true">
        <CheckIcon weight="bold" />
      </span>
      <span className="checkbox__copy">
        <span className="checkbox__label">{label}</span>
        {description ? (
          <span className="checkbox__description">{description}</span>
        ) : null}
      </span>
    </label>
  );
};
