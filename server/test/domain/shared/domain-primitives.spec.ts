import { DomainError } from '../../../src/domain/shared/domain-error';
import { assertPositiveNumber, createId } from '../../../src/domain/shared/id';

describe('shared domain primitives', () => {
  it('rejects empty ids', () => {
    expect(() => createId('')).toThrow(DomainError);
  });

  it('rejects non-positive numeric values', () => {
    expect(() => assertPositiveNumber(0, 'voteWeight')).toThrow(DomainError);
  });

  it('accepts valid ids and positive numeric values', () => {
    expect(createId('vote-1')).toBe('vote-1');
    expect(() => assertPositiveNumber(1.25, 'voteWeight')).not.toThrow();
  });
});
