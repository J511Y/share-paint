import test from 'node:test';
import assert from 'node:assert/strict';

import { isWithinQuietHours } from '../src/quietHours.js';

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
});
