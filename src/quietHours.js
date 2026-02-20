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
  const minuteLabel = label ? `${label}Minute` : 'minute';
  const hourLabel = label ? `${label}Hour` : 'hour';

  if (hour === 24) {
    if (minute !== 0) {
      throw new RangeError(`${minuteLabel} must be 0 when ${hourLabel} is 24`);
    }
    return 0;
  }

  return hour;
}

function toMinuteOfDay(hour, minute) {
  return (hour * 60) + minute;
}

function forwardDeltaMinutes(current, target) {
  return (target - current + (24 * 60)) % (24 * 60);
}

export function isWithinQuietTime(
  hour,
  minute = 0,
  startHour = 23,
  startMinute = 0,
  endHour = 8,
  endMinute = 0,
) {
  assertHourInRange(hour, 'hour', 0, 24);
  assertMinuteInRange(minute, 'minute');
  assertHourInRange(startHour, 'startHour', 0, 24);
  assertMinuteInRange(startMinute, 'startMinute');
  assertHourInRange(endHour, 'endHour', 0, 24);
  assertMinuteInRange(endMinute, 'endMinute');

  const normalizedHour = normalizeBoundaryHour(hour, minute, '');
  const normalizedStartHour = normalizeBoundaryHour(startHour, startMinute, 'start');
  const normalizedEndHour = normalizeBoundaryHour(endHour, endMinute, 'end');

  const current = toMinuteOfDay(normalizedHour, minute);
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

  let resolvedUseUTC = useUTC;
  let resolvedStartMinute = startMinute;
  let resolvedEndMinute = endMinute;

  // Backward compatibility:
  // Legacy signature was isQuietNow(date, startHour, endHour, startMinute, endMinute)
  // and now also supports an optional trailing useUTC boolean:
  // isQuietNow(date, startHour, endHour, startMinute, endMinute, useUTC)
  if (typeof useUTC === 'number') {
    const trailingUseUTC = arguments.length >= 6 ? arguments[5] : false;

    if (typeof trailingUseUTC !== 'boolean') {
      throw new TypeError('useUTC must be a boolean');
    }

    resolvedUseUTC = trailingUseUTC;
    resolvedStartMinute = useUTC;
    resolvedEndMinute = arguments.length >= 5 ? startMinute : 0;
  }

  if (typeof resolvedUseUTC !== 'boolean') {
    throw new TypeError('useUTC must be a boolean');
  }

  const hour = resolvedUseUTC ? date.getUTCHours() : date.getHours();
  const minute = resolvedUseUTC ? date.getUTCMinutes() : date.getMinutes();

  return isWithinQuietTime(hour, minute, startHour, resolvedStartMinute, endHour, resolvedEndMinute);
}
