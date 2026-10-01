import * as styles from './classes.css.ts';
import { useToggleSound } from '@/lib/audio/sound-context';
import type { InputHTMLAttributes, ReactNode } from 'react';
import { CheckIcon } from './icons';

interface CheckboxProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'type'
> {
  description?: ReactNode;
  label: ReactNode;
}

export const Checkbox = ({
  description,
  label,
  onChange,
  ...props
}: CheckboxProps) => {
  const handleChange = useToggleSound(onChange);

  return (
    <label className="checkbox">
      <input {...props} onChange={handleChange} type="checkbox" />
      <span className={styles.checkboxControl} aria-hidden="true">
        <CheckIcon weight="bold" />
      </span>
      <span className={styles.checkboxCopy}>
        <span className={styles.checkboxLabel}>{label}</span>
        {description ? (
          <span className={styles.checkboxDescription}>{description}</span>
        ) : null}
      </span>
    </label>
  );
};
