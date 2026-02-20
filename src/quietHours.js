function assertHourInRange(value, label, min = 0, max = 23) {
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new RangeError(`${label} must be an integer between ${min} and ${max}`);
  }
}

export function isWithinQuietHours(hour, startHour = 23, endHour = 8) {
  assertHourInRange(hour, 'hour', 0, 23);
  assertHourInRange(startHour, 'startHour', 0, 23);
  assertHourInRange(endHour, 'endHour', 0, 24);

  if (startHour === endHour) {
    return true;
  }

  if (startHour < endHour) {
    return hour >= startHour && hour < endHour;
  }

  return hour >= startHour || hour < endHour;
}

export function isQuietNow(date = new Date(), startHour = 23, endHour = 8, useUTC = false) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    throw new TypeError('date must be a valid Date instance');
  }

  if (typeof useUTC !== 'boolean') {
    throw new TypeError('useUTC must be a boolean');
  }

  const hour = useUTC ? date.getUTCHours() : date.getHours();
  return isWithinQuietHours(hour, startHour, endHour);
}
