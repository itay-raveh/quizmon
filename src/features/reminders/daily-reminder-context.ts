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
  hour: number;
  recordDailyCompletion: (date: string) => void;
  setHour: (hour: number) => Promise<void>;
  status: DailyReminderStatus;
}

const unavailable = () => Promise.resolve();

export const DailyReminderContext = createContext<DailyReminderContextValue>({
  busy: false,
  disable: unavailable,
  enable: unavailable,
  error: null,
  hour: 8,
  recordDailyCompletion: () => undefined,
  setHour: unavailable,
  status: 'unsupported',
});

export const useDailyReminder = () => useContext(DailyReminderContext);
