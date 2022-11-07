import { useModifiers } from 'lib/modifiers/context';
import { useModifiersFormContext } from 'lib/modifiers/form/context';
import { useEffect, type FC } from 'react';

/**
 * On mount, set the form values to the modifiers context.
 *
 * Honestly, not proud of this, but I don't have a solution.
 *
 * The problem is that the `Modal` element does not mount/unmount,
 * its always mounted, it's just sometimes invisible.
 *
 * This components is meant to live within the modal,
 * so it *does* mount/unmount.
 *
 * Thus, in this component I can use the normal no deps `useEffect`.
 *
 * And obviously `null` is returned, as this component is just for the logic.
 *
 * Hopefully in the future the Mantine `Modal` will provide an `onOpen` callback prop for stuff like this.
 */
const ModifiersLoader: FC = () => {
  const modifiers = useModifiers();
  const form = useModifiersFormContext();

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => form.setValues(modifiers), []);

  return null;
};

export default ModifiersLoader;
