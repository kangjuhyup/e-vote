import { DomainError } from './domain-error';

export function createId(value: string): string {
  if (value.trim().length === 0) {
    throw new DomainError('id must not be empty');
  }

  return value;
}

export function assertPositiveNumber(value: number, fieldName: string): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new DomainError(`${fieldName} must be positive`);
  }
}
