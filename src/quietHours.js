function assertHourInRange(value, label, min = 0, max = 23) {
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new RangeError(`${label} must be an integer between ${min} and ${max}`);
  }
}

function assertMinuteInRange(value, label) {
  if (!Number.isInteger(value) || value < 0 || value > 59) {
    throw new RangeError(`${label} must be an integer between 0 and 59`);
  }
}

function normalizeBoundaryHour(hour, minute, label) {
  if (hour === 24) {
    if (minute !== 0) {
      throw new RangeError(`${label}Minute must be 0 when ${label}Hour is 24`);
    }
    return 0;
  }

  return hour;
}

function toMinuteOfDay(hour, minute) {
  return (hour * 60) + minute;
}

export function isWithinQuietTime(
  hour,
  minute = 0,
  startHour = 23,
  startMinute = 0,
  endHour = 8,
  endMinute = 0,
) {
  assertHourInRange(hour, 'hour', 0, 23);
  assertMinuteInRange(minute, 'minute');
  assertHourInRange(startHour, 'startHour', 0, 24);
  assertMinuteInRange(startMinute, 'startMinute');
  assertHourInRange(endHour, 'endHour', 0, 24);
  assertMinuteInRange(endMinute, 'endMinute');

  const normalizedStartHour = normalizeBoundaryHour(startHour, startMinute, 'start');
  const normalizedEndHour = normalizeBoundaryHour(endHour, endMinute, 'end');

  const current = toMinuteOfDay(hour, minute);
  const start = toMinuteOfDay(normalizedStartHour, startMinute);
  const end = toMinuteOfDay(normalizedEndHour, endMinute);

  if (start === end) {
    return true;
  }

  if (start < end) {
    return current >= start && current < end;
  }

  return current >= start || current < end;
}

export function isWithinQuietHours(hour, startHour = 23, endHour = 8) {
  return isWithinQuietTime(hour, 0, startHour, 0, endHour, 0);
}

export function isQuietNow(
  date = new Date(),
  startHour = 23,
  endHour = 8,
  useUTC = false,
  startMinute = 0,
  endMinute = 0,
) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    throw new TypeError('date must be a valid Date instance');
  }

  if (typeof useUTC !== 'boolean') {
    throw new TypeError('useUTC must be a boolean');
  }

  const hour = useUTC ? date.getUTCHours() : date.getHours();
  const minute = useUTC ? date.getUTCMinutes() : date.getMinutes();

  return isWithinQuietTime(hour, minute, startHour, startMinute, endHour, endMinute);
}
