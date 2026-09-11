import {
  useEffect,
  useRef,
  type PointerEvent,
  type RefObject,
  type SyntheticEvent,
} from 'react';

const isDialogBackdropPointerDown = (
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
  onDismiss: () => void,
  {
    initialFocus,
    dismissOnBackdrop = false,
  }: {
    initialFocus?: RefObject<HTMLElement | null>;
    dismissOnBackdrop?: boolean;
  } = {},
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

  const closeDialog = () => {
    dialog.current?.close();
    onDismiss();
  };

  return {
    dialog,
    closeDialog,
    dialogProps: {
      ref: dialog,
      onCancel: (event: SyntheticEvent<HTMLDialogElement>) => {
        event.preventDefault();
        closeDialog();
      },
      onPointerDown: dismissOnBackdrop
        ? (event: PointerEvent<HTMLDialogElement>) => {
            if (isDialogBackdropPointerDown(event)) closeDialog();
          }
        : undefined,
    },
  };
};
