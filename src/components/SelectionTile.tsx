import type { ChangeEvent, InputHTMLAttributes, ReactNode } from 'react';
import { useGameSounds } from '@/audio/sound';

interface SelectionTileProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'type'
> {
  label: ReactNode;
  variant?: 'generation' | 'topic';
}

export const SelectionTile = ({
  checked,
  label,
  onChange,
  variant = 'topic',
  ...props
}: SelectionTileProps) => {
  const { playDown, playOff, playOn } = useGameSounds();

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) playOn();
    else playOff();
    onChange?.(event);
  };

  return (
    <label className={`selection-tile selection-tile--${variant}`}>
      <input
        {...props}
        checked={checked}
        onChange={handleChange}
        onPointerDown={() => playDown()}
        type="checkbox"
      />
      <span className="selection-tile__surface">
        <span className="selection-tile__label">{label}</span>
        <span className="selection-tile__check" aria-hidden="true" />
      </span>
    </label>
  );
};
