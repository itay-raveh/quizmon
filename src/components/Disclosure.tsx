import { Collapsible } from '@base-ui/react/collapsible';
import type { ComponentProps, ReactNode } from 'react';

type Props = Omit<ComponentProps<typeof Collapsible.Root>, 'className'> & {
  label: ReactNode;
  className?: string;
};

export const Disclosure = ({
  label,
  children,
  className = '',
  ...props
}: Props) => (
  <Collapsible.Root {...props} className={`disclosure ${className}`}>
    <Collapsible.Trigger className="disclosure-trigger">
      {label}
    </Collapsible.Trigger>
    <Collapsible.Panel keepMounted>{children}</Collapsible.Panel>
  </Collapsible.Root>
);
