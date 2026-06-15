import 'reflect-metadata';
import { App } from './app';
import { Logger } from './utils/logger';

async function main(): Promise<void> {
  const logger = new Logger('Bootstrap');
  try {
    const app = new App();
    await app.initialize();
    await app.start();
    logger.info('Application started successfully');
  } catch (error) {
    logger.error('Failed to start application', error);
    process.exit(1);
  }
}

main();