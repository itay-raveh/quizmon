import { createContext, useContext } from 'react';

export type DailyReminderStatus =
  | 'available'
  | 'blocked'
  | 'checking'
  | 'enabled'
  | 'install-required'
  | 'unsupported';

export interface DailyReminderContextValue {
  busy: boolean;
  disable: () => Promise<void>;
  enable: () => Promise<void>;
  error: string | null;
  time: string;
  recordDailyCompletion: (date: string) => void;
  setTime: (time: string) => Promise<void>;
  status: DailyReminderStatus;
}

const unavailable = () => Promise.resolve();

export const DailyReminderContext = createContext<DailyReminderContextValue>({
  busy: false,
  disable: unavailable,
  enable: unavailable,
  error: null,
  time: '08:00',
  recordDailyCompletion: () => undefined,
  setTime: unavailable,
  status: 'unsupported',
});

export const useDailyReminder = () => useContext(DailyReminderContext);
