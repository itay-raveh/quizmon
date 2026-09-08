import type { InputHTMLAttributes, ReactNode } from 'react';
import { useToggleSound } from '@/audio/sound';
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
  const handleChange = useToggleSound(onChange);

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
