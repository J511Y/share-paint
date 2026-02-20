import test from 'node:test';
import assert from 'node:assert/strict';

import { isQuietNow, isWithinQuietHours, isWithinQuietTime } from '../src/quietHours.js';

test('returns true during default overnight quiet hours (23-08)', () => {
  assert.equal(isWithinQuietHours(23), true);
  assert.equal(isWithinQuietHours(2), true);
  assert.equal(isWithinQuietHours(7), true);
});

test('returns false outside default overnight quiet hours', () => {
  assert.equal(isWithinQuietHours(8), false);
  assert.equal(isWithinQuietHours(15), false);
  assert.equal(isWithinQuietHours(22), false);
});

test('handles daytime window when startHour < endHour', () => {
  assert.equal(isWithinQuietHours(10, 9, 17), true);
  assert.equal(isWithinQuietHours(16, 9, 17), true);
  assert.equal(isWithinQuietHours(17, 9, 17), false);
  assert.equal(isWithinQuietHours(8, 9, 17), false);
});

test('supports endHour=24 as an exclusive midnight boundary', () => {
  assert.equal(isWithinQuietHours(22, 22, 24), true);
  assert.equal(isWithinQuietHours(23, 22, 24), true);
  assert.equal(isWithinQuietHours(0, 22, 24), false);
});

test('supports startHour=24 as an alias for midnight boundary', () => {
  assert.equal(isWithinQuietHours(0, 24, 6), true);
  assert.equal(isWithinQuietHours(5, 24, 6), true);
  assert.equal(isWithinQuietHours(6, 24, 6), false);
  assert.equal(isWithinQuietHours(22, 24, 6), false);
});

test('supports minute-level quiet windows with overnight boundary', () => {
  assert.equal(isWithinQuietTime(22, 30, 22, 30, 6, 15), true);
  assert.equal(isWithinQuietTime(6, 14, 22, 30, 6, 15), true);
  assert.equal(isWithinQuietTime(6, 15, 22, 30, 6, 15), false);
  assert.equal(isWithinQuietTime(12, 0, 22, 30, 6, 15), false);
});

test('supports minute-level daytime windows with inclusive/exclusive boundaries', () => {
  assert.equal(isWithinQuietTime(9, 0, 9, 0, 17, 30), true);
  assert.equal(isWithinQuietTime(17, 29, 9, 0, 17, 30), true);
  assert.equal(isWithinQuietTime(17, 30, 9, 0, 17, 30), false);
  assert.equal(isWithinQuietTime(8, 59, 9, 0, 17, 30), false);
});

test('handles custom overnight window when startHour > endHour', () => {
  assert.equal(isWithinQuietHours(22, 22, 6), true);
  assert.equal(isWithinQuietHours(3, 22, 6), true);
  assert.equal(isWithinQuietHours(6, 22, 6), false);
  assert.equal(isWithinQuietHours(14, 22, 6), false);
});

test('treats equal start and end hour as all-day quiet mode', () => {
  assert.equal(isWithinQuietHours(0, 12, 12), true);
  assert.equal(isWithinQuietHours(13, 12, 12), true);
});

test('throws for out-of-range or non-integer hours', () => {
  assert.throws(() => isWithinQuietHours(24), /hour must be an integer/);
  assert.throws(() => isWithinQuietHours(-1), /hour must be an integer/);
  assert.throws(() => isWithinQuietHours(10.5), /hour must be an integer/);
  assert.throws(() => isWithinQuietHours(10, 99, 8), /startHour must be an integer/);
  assert.throws(() => isWithinQuietHours(10, 23, -3), /endHour must be an integer/);
  assert.throws(() => isWithinQuietHours(10, 23, 25), /endHour must be an integer between 0 and 24/);
  assert.throws(() => isWithinQuietTime(1, 0, 24, 1, 6, 0), /startMinute must be 0 when startHour is 24/);
});

test('isQuietNow reads hour from Date and delegates to window logic', () => {
  const evening = new Date('2026-02-20T23:30:00+09:00');
  const day = new Date('2026-02-20T12:00:00+09:00');

  assert.equal(isQuietNow(evening), true);
  assert.equal(isQuietNow(day), false);
  assert.equal(isQuietNow(day, 9, 17), true);
});

test('isQuietNow supports minute-level start/end boundaries', () => {
  const boundaryInside = new Date('2026-02-20T22:45:00+09:00');
  const boundaryOutside = new Date('2026-02-21T06:15:00+09:00');

  assert.equal(isQuietNow(boundaryInside, 22, 6, false, 30, 15), true);
  assert.equal(isQuietNow(boundaryOutside, 22, 6, false, 30, 15), false);
});

test('isQuietNow can evaluate quiet hours in UTC', () => {
  const utcAfternoon = new Date('2026-02-20T14:30:00Z');

  assert.equal(isQuietNow(utcAfternoon, 23, 8), true);
  assert.equal(isQuietNow(utcAfternoon, 23, 8, true), false);
});

test('isQuietNow throws on invalid Date input', () => {
  assert.throws(() => isQuietNow('2026-02-20'), /valid Date instance/);
  assert.throws(() => isQuietNow(new Date('invalid-date')), /valid Date instance/);
  assert.throws(() => isQuietNow(new Date(), 23, 8, 'yes'), /useUTC must be a boolean/);
  assert.throws(() => isQuietNow(new Date(), 23, 8, false, 60, 0), /startMinute must be an integer between 0 and 59/);
});
