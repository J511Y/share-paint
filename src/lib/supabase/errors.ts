type SupabaseErrorLike = {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
} | null;

function normalizeMessage(message: string | undefined): string {
  return (message || '').toLowerCase();
}

export function isRlsOrPermissionError(error: SupabaseErrorLike): boolean {
  if (!error) return false;

  if (error.code === '42501') return true;

  const message = normalizeMessage(error.message);
  return (
    message.includes('row-level security') ||
    message.includes('permission denied') ||
    message.includes('insufficient privilege')
  );
}

export function isUniqueViolation(error: SupabaseErrorLike): boolean {
  return !!error && error.code === '23505';
}

export function toErrorDetails(error: SupabaseErrorLike):
  | {
      code?: string;
      message?: string;
      details?: string;
      hint?: string;
    }
  | undefined {
  if (!error) return undefined;

  return {
    code: error.code,
    message: error.message,
    details: error.details,
    hint: error.hint,
  };
}
