import { Logger } from '@kangjuhyup/rvlog';
import type { HttpExceptionLogger } from '../../shared/presentation/common/filter/http-exception-logger';

export class RvlogHttpExceptionLogger implements HttpExceptionLogger {
  private readonly logger = new Logger('HTTP');

  warn(message: string): void {
    this.logger.warn(message);
  }

  error(message: string, error: Error): void {
    this.logger.error(message, error);
  }
}
