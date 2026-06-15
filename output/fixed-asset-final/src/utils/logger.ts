export class Logger {
  private context: string;

  constructor(context: string) {
    this.context = context;
  }

  public info(message: string, ...args: unknown[]): void {
    this.log('INFO', message, args);
  }

  public error(message: string, error?: unknown): void {
    this.log('ERROR', message, error ? [error] : []);
  }

  public warn(message: string, ...args: unknown[]): void {
    this.log('WARN', message, args);
  }

  public debug(message: string, ...args: unknown[]): void {
    this.log('DEBUG', message, args);
  }

  private log(level: string, message: string, args: unknown[]): void {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level}] [${this.context}] ${message}`;
    if (args.length > 0) {
      console.log(logMessage, ...args);
    } else {
      console.log(logMessage);
    }
  }
}