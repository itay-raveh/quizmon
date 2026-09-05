import { useEffect, useRef, type PointerEvent, type RefObject } from 'react';

export const isDialogBackdropPointerDown = (
  event: PointerEvent<HTMLDialogElement>,
): boolean => {
  const bounds = event.currentTarget.getBoundingClientRect();
  return (
    event.clientX < bounds.left ||
    event.clientX > bounds.right ||
    event.clientY < bounds.top ||
    event.clientY > bounds.bottom
  );
};

export const useModalDialog = (
  initialFocus?: RefObject<HTMLElement | null>,
) => {
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    initialFocus?.current?.focus();
    return () => {
      if (element?.open) element.close();
    };
  }, [initialFocus]);

  return dialog;
};
