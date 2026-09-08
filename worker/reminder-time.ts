const REMINDER_HOUR = 8;

interface ZonedDateParts {
  day: number;
  hour: number;
  minute: number;
  month: number;
  second: number;
  year: number;
}

export const getZonedDateParts = (
  timestamp: number,
  timeZone: string,
): ZonedDateParts => {
  const parts = new Intl.DateTimeFormat('en-US', {
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
    minute: '2-digit',
    month: '2-digit',
    second: '2-digit',
    timeZone,
    year: 'numeric',
  }).formatToParts(new Date(timestamp));
  const values = Object.fromEntries(
    parts.map(({ type, value }) => [type, value]),
  );
  return {
    day: Number(values.day),
    hour: Number(values.hour),
    minute: Number(values.minute),
    month: Number(values.month),
    second: Number(values.second),
    year: Number(values.year),
  };
};

export const dateFromParts = ({ day, month, year }: ZonedDateParts): string =>
  `${year.toString().padStart(4, '0')}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;

const datePartsAsUtc = (parts: ZonedDateParts): number =>
  Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );

const zonedTimeToTimestamp = (
  target: ZonedDateParts,
  timeZone: string,
): number => {
  const targetAsUtc = datePartsAsUtc(target);
  let timestamp = targetAsUtc;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const actual = getZonedDateParts(timestamp, timeZone);
    const difference = targetAsUtc - datePartsAsUtc(actual);
    if (difference === 0) break;
    timestamp += difference;
  }

  return timestamp;
};

const addLocalDay = (parts: ZonedDateParts): ZonedDateParts => {
  const next = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + 1));
  return {
    ...parts,
    day: next.getUTCDate(),
    month: next.getUTCMonth() + 1,
    year: next.getUTCFullYear(),
  };
};

export const getNextReminderAt = (
  timeZone: string,
  now = Date.now(),
): number => {
  const localNow = getZonedDateParts(now, timeZone);
  let target = {
    ...localNow,
    hour: REMINDER_HOUR,
    minute: 0,
    second: 0,
  };
  let timestamp = zonedTimeToTimestamp(target, timeZone);
  if (timestamp <= now) {
    target = addLocalDay(target);
    timestamp = zonedTimeToTimestamp(target, timeZone);
  }
  return timestamp;
};
