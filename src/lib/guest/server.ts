import { z } from 'zod';
import type { NextRequest } from 'next/server';

const GuestIdSchema = z
  .string()
  .trim()
  .min(8)
  .max(128)
  .regex(/^[a-zA-Z0-9:-]+$/, 'Invalid guest id format');

const GuestNameSchema = z
  .string()
  .trim()
  .min(1)
  .max(24)
  .transform((value) => value.replace(/\s+/g, ' '));

export interface GuestRequestIdentity {
  guestId: string;
  displayName: string;
}

function toFallbackName(guestId: string): string {
  return `게스트 ${guestId.slice(0, 4)}`;
}

export function getGuestActorId(guestId: string): string {
  return `guest:${guestId}`;
}

export function getGuestIdentityFromRequest(
  request: NextRequest
): GuestRequestIdentity | null {
  const rawGuestId =
    request.headers.get('x-guest-id') ||
    request.cookies.get('paintshare_guest_id')?.value ||
    '';

  const parsedGuestId = GuestIdSchema.safeParse(rawGuestId);
  if (!parsedGuestId.success) {
    return null;
  }

  const rawGuestName =
    request.headers.get('x-guest-name') ||
    request.cookies.get('paintshare_guest_name')?.value ||
    '';

  const parsedGuestName = GuestNameSchema.safeParse(rawGuestName);

  return {
    guestId: parsedGuestId.data,
    displayName: parsedGuestName.success
      ? parsedGuestName.data
      : toFallbackName(parsedGuestId.data),
  };
}
