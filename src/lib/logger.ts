import { createAdminClient, hasAdminClientEnv } from '@/lib/supabase/admin';
import type { Database } from '@/types/database';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  error?: Error | unknown;
  requestId?: string;
  userId?: string;
  path?: string;
  method?: string;
  statusCode?: number;
  duration?: number;
}

const LOG_COLORS = {
  debug: '\x1b[36m', // cyan
  info: '\x1b[32m',  // green
  warn: '\x1b[33m',  // yellow
  error: '\x1b[31m', // red
  reset: '\x1b[0m',
};

function formatError(error: unknown): { message: string; stack?: string } {
  if (error instanceof Error) {
    return { message: error.message, stack: error.stack };
  }
  return { message: String(error) };
}

function formatLogForConsole(entry: LogEntry): string {
  const timestamp = new Date().toISOString();
  const color = LOG_COLORS[entry.level];
  const reset = LOG_COLORS.reset;

  let log = `${color}[${timestamp}] [${entry.level.toUpperCase()}]${reset}`;

  if (entry.requestId) log += ` [${entry.requestId.slice(0, 8)}]`;
  if (entry.method && entry.path) log += ` ${entry.method} ${entry.path}`;
  if (entry.statusCode) log += ` -> ${entry.statusCode}`;
  if (entry.duration) log += ` (${entry.duration}ms)`;

  log += ` ${entry.message}`;

  if (entry.context && Object.keys(entry.context).length > 0) {
    log += `\n  Context: ${JSON.stringify(entry.context, null, 2)}`;
  }

  if (entry.error) {
    const errorInfo = formatError(entry.error);
    log += `\n  Error: ${errorInfo.message}`;
    if (errorInfo.stack) {
      log += `\n  Stack: ${errorInfo.stack}`;
    }
  }

  return log;
}

let hasWarnedMissingAdminEnv = false;

async function saveToSupabase(entry: LogEntry): Promise<void> {
  if (!hasAdminClientEnv()) {
    if (!hasWarnedMissingAdminEnv) {
      hasWarnedMissingAdminEnv = true;
      console.warn('[Logger] Skipping Supabase log persistence: missing admin env');
    }
    return;
  }

  try {
    const supabase = createAdminClient();

    const logData: Database['public']['Tables']['api_logs']['Insert'] = {
      level: entry.level,
      message: entry.message,
      context: entry.context || {},
      error_message: entry.error ? formatError(entry.error).message : null,
      error_stack: entry.error ? formatError(entry.error).stack : null,
      request_id: entry.requestId,
      user_id: entry.userId,
      path: entry.path,
      method: entry.method,
      status_code: entry.statusCode,
      duration_ms: entry.duration,
    };

    await supabase.from('api_logs').insert(logData);
  } catch (err) {
    // 로깅 실패 시 콘솔에만 출력 (무한 루프 방지)
    console.error('[Logger] Failed to save log to Supabase:', err);
  }
}

class Logger {
  private shouldSaveToDb: boolean;

  constructor(saveToDb = true) {
    this.shouldSaveToDb = saveToDb;
  }

  private async log(entry: LogEntry): Promise<void> {
    // 콘솔 출력
    console.log(formatLogForConsole(entry));

    // Supabase 저장 (error, warn만 저장하거나 모두 저장 가능)
    if (this.shouldSaveToDb && (entry.level === 'error' || entry.level === 'warn')) {
      await saveToSupabase(entry);
    }
  }

  debug(message: string, context?: Record<string, unknown>): void {
    this.log({ level: 'debug', message, context });
  }

  info(message: string, context?: Record<string, unknown>): void {
    this.log({ level: 'info', message, context });
  }

  warn(message: string, context?: Record<string, unknown>): void {
    this.log({ level: 'warn', message, context });
  }

  error(message: string, error?: unknown, context?: Record<string, unknown>): void {
    this.log({ level: 'error', message, error, context });
  }

  // API 요청 로깅용
  request(entry: Omit<LogEntry, 'level'>): void {
    this.log({ ...entry, level: entry.statusCode && entry.statusCode >= 400 ? 'error' : 'info' });
  }
}

export const logger = new Logger(process.env.NODE_ENV === 'production');

// 개발 환경에서도 DB 저장하려면 아래 사용
export const devLogger = new Logger(true);
