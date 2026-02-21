import { z } from 'zod';

type DynamicParams = { [key: string]: unknown };

export function getStringParam(
  params: DynamicParams | undefined,
  key: string
): string | null {
  const value = params?.[key];

  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  if (Array.isArray(value)) {
    const first = value[0];
    if (typeof first === 'string') {
      const trimmed = first.trim();
      return trimmed.length > 0 ? trimmed : null;
    }
  }

  return null;
}

export function getUuidParam(params: DynamicParams | undefined, key: string): string | null {
  const value = getStringParam(params, key);
  const parsed = z.string().uuid().safeParse(value);
  return parsed.success ? parsed.data : null;
}
