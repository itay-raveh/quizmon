import { Field } from '@base-ui/react/field';
import { Checkbox as BaseCheckbox } from '@base-ui/react/checkbox';
import { useInteractionSound } from '@/lib/audio/sound-context';
import type { ComponentProps, ReactNode } from 'react';
import { CheckIcon } from './icons';

type CheckboxProps = ComponentProps<typeof BaseCheckbox.Root> & {
  description?: ReactNode;
  label: ReactNode;
};

export const Checkbox = ({
  description,
  label,
  onCheckedChange,
  ...props
}: CheckboxProps) => {
  const play = useInteractionSound();
  return (
    <Field.Root
      render={
        <BaseCheckbox.Root
          {...props}
          onCheckedChange={(checked, details) => {
            play(checked ? 'toggle-on' : 'toggle-off');
            onCheckedChange?.(checked, details);
          }}
        />
      }
      className="checkbox"
    >
      <span className="checkbox__control" aria-hidden="true">
        <CheckIcon weight="bold" />
      </span>
      <span className="checkbox__copy">
        <Field.Label
          className="checkbox__label"
          render={<span />}
          nativeLabel={false}
        >
          {label}
        </Field.Label>
        {description ? (
          <Field.Description
            className="checkbox__description"
            render={<span />}
          >
            {description}
          </Field.Description>
        ) : null}
      </span>
    </Field.Root>
  );
};
