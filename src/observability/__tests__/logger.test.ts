/**
 * Structured Logger — Tests
 */

import { createLogger, StructuredLogger, runWithTrace, getCurrentTraceId, createRootLogger } from '../logger';

describe('StructuredLogger', () => {
  let output: string[];

  beforeEach(() => {
    output = [];
  });

  function captureLogger(): StructuredLogger {
    const logger = new StructuredLogger('test-module', 'debug');
    // Override the output stream
    (logger as any).out = {
      write: (chunk: string) => { output.push(chunk); },
    } as NodeJS.WritableStream;
    return logger;
  }

  it('outputs valid JSON with required fields', () => {
    const logger = captureLogger();
    logger.info('test message');

    expect(output).toHaveLength(1);
    const entry = JSON.parse(output[0]);
    expect(entry.level).toBe('info');
    expect(entry.module).toBe('test-module');
    expect(entry.msg).toBe('test message');
    expect(entry.ts).toBeDefined();
    expect(typeof entry.ts).toBe('number');
  });

  it('includes data field when provided', () => {
    const logger = captureLogger();
    logger.info('with data', { key: 'value', count: 42 });

    const entry = JSON.parse(output[0]);
    expect(entry.data).toEqual({ key: 'value', count: 42 });
  });

  it('does not output data field when not provided', () => {
    const logger = captureLogger();
    logger.info('no data');

    const entry = JSON.parse(output[0]);
    expect(entry.data).toBeUndefined();
  });

  it('respects log level filtering', () => {
    const logger = new StructuredLogger('test', 'warn');
    (logger as any).out = { write: (chunk: string) => { output.push(chunk); } } as NodeJS.WritableStream;

    logger.debug('should not appear');
    logger.info('should not appear');
    logger.warn('should appear');
    logger.error('should appear');

    expect(output).toHaveLength(2);
    expect(JSON.parse(output[0]).level).toBe('warn');
    expect(JSON.parse(output[1]).level).toBe('error');
  });

  it('creates child loggers with different module', () => {
    const parent = captureLogger();
    const child = parent.child('child-module') as StructuredLogger;
    (child as any).out = { write: (chunk: string) => { output.push(chunk); } } as NodeJS.WritableStream;

    child.info('child message');

    const entry = JSON.parse(output[0]);
    expect(entry.module).toBe('child-module');
  });

  it('propagates trace ID to log entries', () => {
    const logger = captureLogger();
    const traced = logger.withTrace('test-trace-123') as StructuredLogger;
    (traced as any).out = { write: (chunk: string) => { output.push(chunk); } } as NodeJS.WritableStream;

    traced.info('traced message');

    const entry = JSON.parse(output[0]);
    expect(entry.traceId).toBe('test-trace-123');
  });

  it('creates logger from factory function', () => {
    const logger = createLogger('factory-test');
    expect(logger).toBeInstanceOf(StructuredLogger);
  });

  it('creates root logger with default module', () => {
    const logger = createRootLogger();
    expect(logger).toBeInstanceOf(StructuredLogger);
  });
});

describe('AsyncLocalStorage trace propagation', () => {
  it('getCurrentTraceId returns undefined outside trace context', () => {
    expect(getCurrentTraceId()).toBeUndefined();
  });

  it('getCurrentTraceId returns trace ID inside trace context', () => {
    let captured: string | undefined;
    runWithTrace('async-trace-42', () => {
      captured = getCurrentTraceId();
    });
    expect(captured).toBe('async-trace-42');
  });

  it('runWithTrace returns the function result', () => {
    const result = runWithTrace('trace-x', () => 42);
    expect(result).toBe(42);
  });

  it('nested runWithTrace uses inner trace ID', () => {
    let outer: string | undefined;
    let inner: string | undefined;

    runWithTrace('outer-trace', () => {
      outer = getCurrentTraceId();
      runWithTrace('inner-trace', () => {
        inner = getCurrentTraceId();
      });
    });

    expect(outer).toBe('outer-trace');
    expect(inner).toBe('inner-trace');
  });

  it('log entries within runWithTrace get trace ID automatically', () => {
    const output: string[] = [];
    const logger = createLogger('async-test', 'debug');
    (logger as any).out = { write: (chunk: string) => { output.push(chunk); } } as NodeJS.WritableStream;

    runWithTrace('auto-trace-123', () => {
      logger.info('auto traced');
    });

    const entry = JSON.parse(output[0]);
    expect(entry.traceId).toBe('auto-trace-123');
  });
});
