import { Toast as BaseToast } from '@base-ui/react/toast';
import { useEffect, useEffectEvent } from 'react';
import { CheckIcon, XIcon } from './icons';
import { SoundButton } from './SoundButton';

type Props = { message: string; onDismiss: () => void };

const Notification = ({ message, onDismiss }: Props) => {
  const { add, close, toasts } = BaseToast.useToastManager();
  const dismiss = useEffectEvent(onDismiss);
  useEffect(() => {
    let active = true;
    const id = add({
      title: message,
      onClose: () => {
        if (active) dismiss();
      },
    });
    return () => {
      active = false;
      close(id);
    };
  }, [message, add, close]);
  return (
    <BaseToast.Portal>
      <BaseToast.Viewport className="toast-viewport">
        {toasts.map((toast) => (
          <BaseToast.Root
            className="toast"
            key={toast.id}
            toast={toast}
            swipeDirection={[]}
          >
            <BaseToast.Title className="toast__message">
              <CheckIcon aria-hidden="true" weight="bold" />
              <span>{toast.title}</span>
            </BaseToast.Title>
            <BaseToast.Close
              render={<SoundButton />}
              aria-label="Dismiss notification"
              className="toast__dismiss"
            >
              <XIcon aria-hidden="true" weight="bold" />
            </BaseToast.Close>
          </BaseToast.Root>
        ))}
      </BaseToast.Viewport>
    </BaseToast.Portal>
  );
};

export const Toast = (props: Props) => (
  <BaseToast.Provider timeout={6000} limit={1}>
    <Notification {...props} />
  </BaseToast.Provider>
);
