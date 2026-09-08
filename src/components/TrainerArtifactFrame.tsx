import type { ComponentPropsWithRef } from 'react';

export const TrainerArtifactFrame = ({
  className = '',
  ...props
}: ComponentPropsWithRef<'article'>) => (
  <article
    {...props}
    className={`trainer-artifact-frame ${className}`.trim()}
  />
);
