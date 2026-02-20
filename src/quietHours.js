export function isWithinQuietHours(hour, startHour = 23, endHour = 8) {
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) {
    throw new RangeError('hour must be an integer between 0 and 23');
  }

  if (!Number.isInteger(startHour) || startHour < 0 || startHour > 23) {
    throw new RangeError('startHour must be an integer between 0 and 23');
  }

  if (!Number.isInteger(endHour) || endHour < 0 || endHour > 23) {
    throw new RangeError('endHour must be an integer between 0 and 23');
  }

  if (startHour === endHour) {
    return true;
  }

  if (startHour < endHour) {
    return hour >= startHour && hour < endHour;
  }

  return hour >= startHour || hour < endHour;
}
