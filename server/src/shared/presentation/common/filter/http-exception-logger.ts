export interface HttpExceptionLogger {
  warn(message: string): void;
  error(message: string, error: Error): void;
}
