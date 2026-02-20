function assertHourInRange(value, label) {
  if (!Number.isInteger(value) || value < 0 || value > 23) {
    throw new RangeError(`${label} must be an integer between 0 and 23`);
  }
}

export function isWithinQuietHours(hour, startHour = 23, endHour = 8) {
  assertHourInRange(hour, 'hour');
  assertHourInRange(startHour, 'startHour');
  assertHourInRange(endHour, 'endHour');

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
