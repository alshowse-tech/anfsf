/**
 * Logger Utility - ANFSF v2.0
 *
 * 统一日志记录工具，提供一致的日志格式和级别控制
 *
 * @module asf-v4/utils/logger
 */
export interface LoggerConfig {
    level: 'debug' | 'info' | 'warn' | 'error';
    prefix: string;
    timestamp: boolean;
}
export declare class Logger {
    private config;
    constructor(config?: Partial<LoggerConfig>);
    debug(message: string, ...args: any[]): void;
    info(message: string, ...args: any[]): void;
    warn(message: string, ...args: any[]): void;
    error(message: string, ...args: any[]): void;
    private shouldLog;
    private log;
}
export declare const defaultLogger: Logger;
export declare function createModuleLogger(moduleName: string): Logger;
