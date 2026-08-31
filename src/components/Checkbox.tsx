import type { ChangeEvent, InputHTMLAttributes, ReactNode } from 'react';
import useSound from 'use-sound';

const POP_DOWN = '/assets/sounds/pop-down.mp3';
const POP_OFF = '/assets/sounds/pop-up-off.mp3';
const POP_ON = '/assets/sounds/pop-up-on.mp3';

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
  const [playDown] = useSound(POP_DOWN, { volume: 0.25 });
  const [playOff] = useSound(POP_OFF, { volume: 0.25 });
  const [playOn] = useSound(POP_ON, { volume: 0.25 });

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
