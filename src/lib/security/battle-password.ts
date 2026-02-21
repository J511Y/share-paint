import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const PASSWORD_PEPPER = process.env.BATTLE_PASSWORD_PEPPER ?? '';
const KEY_LENGTH = 64;

function getDerivedKey(password: string, salt: string): Buffer {
  return scryptSync(`${password}${PASSWORD_PEPPER}`, salt, KEY_LENGTH);
}

export function hashBattlePassword(password: string): string {
  const salt = randomBytes(16).toString('base64');
  const derivedKey = getDerivedKey(password, salt);
  return `${salt}$${derivedKey.toString('base64')}`;
}

export function verifyBattlePassword(password: string, storedHash: string | null): boolean {
  if (!storedHash) {
    return false;
  }

  const [salt, encodedHash] = storedHash.split('$');
  if (!salt || !encodedHash) {
    return false;
  }

  try {
    const expected = Buffer.from(encodedHash, 'base64');
    const actual = getDerivedKey(password, salt);

    if (expected.length !== actual.length) {
      return false;
    }

    return timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}
