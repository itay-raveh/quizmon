import { Checkbox } from '@base-ui/react/checkbox';
import { Radio } from '@base-ui/react/radio';
import { useInteractionSound } from '@/lib/audio/sound-context';
import { useId, type ReactNode } from 'react';
import { CheckIcon } from '@/components/icons';

interface SelectionTileProps {
  inputType?: 'checkbox' | 'radio';
  checked?: boolean;
  disabled?: boolean;
  value?: string | number;
  onCheckedChange?: (checked: boolean) => void;
  label: ReactNode;
  description?: ReactNode;
  variant?:
    'form' | 'experience' | 'generation' | 'question-type' | 'training-mode';
}

export const SelectionTile = ({
  description,
  inputType = 'checkbox',
  label,
  onCheckedChange,
  variant = 'question-type',
  checked,
  disabled,
  value,
}: SelectionTileProps) => {
  const play = useInteractionSound();
  const id = useId();
  const props = {
    className: `selection-tile selection-tile--${variant}`,
    disabled,
    'aria-describedby': description ? `${id}-description` : undefined,
    'aria-labelledby': `${id}-label`,
  };
  const content = (
    <span className="selection-tile__surface">
      <span className="selection-tile__label" id={`${id}-label`}>
        {label}
      </span>
      {description ? (
        <span className="selection-tile__description" id={`${id}-description`}>
          {description}
        </span>
      ) : null}
      <span className="selection-tile__check" aria-hidden="true">
        <CheckIcon weight="bold" />
      </span>
    </span>
  );
  return inputType === 'radio' ? (
    <Radio.Root {...props} value={value}>
      {content}
    </Radio.Root>
  ) : (
    <Checkbox.Root
      {...props}
      checked={checked}
      onCheckedChange={(value) => {
        play(value ? 'toggle-on' : 'toggle-off');
        onCheckedChange?.(value);
      }}
    >
      {content}
    </Checkbox.Root>
  );
};
