/**
 * ANFSV V4 Layer 8.6 — Structured Logger
 *
 * JSON-formatted logging with correlation ID, timestamp, level, and module.
 * Works both in HTTP context (with request trace ID) and standalone (pipeline stages).
 *
 * Output format:
 * {"level":"info","ts":1715432100000,"module":"pipeline","traceId":"abc-123","msg":"step started","data":{...}}
 */

import { AsyncLocalStorage } from 'async_hooks';
import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// Log rotation — production FAIL fix
//
// When LOG_FILE is set, writes to a rotating file stream instead of stderr.
// Rotation: max 10MB per file, keep 5 rotated files.
// ============================================================================

const LOG_FILE = process.env.LOG_FILE || '';
const LOG_MAX_SIZE = 10 * 1024 * 1024; // 10MB per file
const LOG_MAX_FILES = 5;

function createRotatingStream(moduleName: string): NodeJS.WritableStream {
  if (!LOG_FILE) return process.stderr;

  const logDir = path.dirname(LOG_FILE);
  if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });

  const baseName = `${LOG_FILE}.${moduleName}`;

  // Check if current file exceeds max size
  let filePath = baseName;
  try {
    if (fs.existsSync(baseName) && fs.statSync(baseName).size >= LOG_MAX_SIZE) {
      rotateFiles(baseName);
    }
  } catch {
    // ignore stat errors
  }

  const stream = fs.createWriteStream(filePath, { flags: 'a' });
  // Also tee to stderr for container logs
  const tee = {
    write: (chunk: string | Buffer): boolean => {
      stream.write(chunk);
      process.stderr.write(chunk);
      return true;
    },
  };
  return tee as unknown as NodeJS.WritableStream;
}

function rotateFiles(baseName: string): void {
  // Rotate: .4 → delete, .3 → .4, .2 → .3, .1 → .2, current → .1
  try {
    const oldest = `${baseName}.${LOG_MAX_FILES}`;
    if (fs.existsSync(oldest)) fs.unlinkSync(oldest);
    for (let i = LOG_MAX_FILES - 1; i >= 1; i--) {
      const src = `${baseName}.${i}`;
      const dst = `${baseName}.${i + 1}`;
      if (fs.existsSync(src)) fs.renameSync(src, dst);
    }
    fs.renameSync(baseName, `${baseName}.1`);
  } catch {
    // ignore rotation errors — fallback to append
  }
}

// ============================================================================
// Types
// ============================================================================

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  level: LogLevel;
  ts: number;
  module: string;
  traceId?: string;
  msg: string;
  data?: Record<string, unknown>;
}

export interface Logger {
  debug(msg: string, data?: Record<string, unknown>): void;
  info(msg: string, data?: Record<string, unknown>): void;
  warn(msg: string, data?: Record<string, unknown>): void;
  error(msg: string, data?: Record<string, unknown>): void;
  child(module: string): Logger;
  withTrace(traceId: string): Logger;
}

// ============================================================================
// AsyncLocalStorage for trace propagation
// ============================================================================

interface TraceContext {
  traceId: string;
}

const traceStorage = new AsyncLocalStorage<TraceContext>();

export function getCurrentTraceId(): string | undefined {
  const ctx = traceStorage.getStore();
  return ctx?.traceId;
}

export function runWithTrace<T>(traceId: string, fn: () => T): T {
  return traceStorage.run({ traceId }, fn);
}

// ============================================================================
// Constants
// ============================================================================

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const DEFAULT_LOG_LEVEL: LogLevel = (process.env.LOG_LEVEL as LogLevel) || 'info';

// ============================================================================
// StructuredLogger
// ============================================================================

export class StructuredLogger implements Logger {
  private module: string;
  private traceId?: string;
  private level: LogLevel;
  private out: NodeJS.WritableStream;

  constructor(module: string, level?: LogLevel, traceId?: string) {
    this.module = module;
    this.level = level ?? DEFAULT_LOG_LEVEL;
    this.traceId = traceId;
    this.out = createRotatingStream(module);
  }

  debug(msg: string, data?: Record<string, unknown>): void {
    this.log('debug', msg, data);
  }

  info(msg: string, data?: Record<string, unknown>): void {
    this.log('info', msg, data);
  }

  warn(msg: string, data?: Record<string, unknown>): void {
    this.log('warn', msg, data);
  }

  error(msg: string, data?: Record<string, unknown>): void {
    this.log('error', msg, data);
  }

  child(module: string): Logger {
    return new StructuredLogger(module, this.level, this.traceId);
  }

  withTrace(traceId: string): Logger {
    return new StructuredLogger(this.module, this.level, traceId);
  }

  private log(level: LogLevel, msg: string, data?: Record<string, unknown>): void {
    if (LEVEL_PRIORITY[level] < LEVEL_PRIORITY[this.level]) return;

    const entry: LogEntry = {
      level,
      ts: Date.now(),
      module: this.module,
      msg,
    };

    // Use async-local trace if available
    const asyncTraceId = getCurrentTraceId();
    if (asyncTraceId) {
      entry.traceId = asyncTraceId;
    } else if (this.traceId) {
      entry.traceId = this.traceId;
    }

    if (data) {
      entry.data = data;
    }

    this.out.write(JSON.stringify(entry) + '\n');
  }
}

// ============================================================================
// Factory
// ============================================================================

export function createLogger(module: string, level?: LogLevel): Logger {
  return new StructuredLogger(module, level);
}

export function createRootLogger(level?: LogLevel): Logger {
  return createLogger('anfsf', level);
}
