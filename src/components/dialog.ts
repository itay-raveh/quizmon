import { useEffect, useRef, type PointerEvent } from 'react';

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

export const useModalDialog = () => {
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => {
      if (element?.open) element.close();
    };
  }, []);

  return dialog;
};
