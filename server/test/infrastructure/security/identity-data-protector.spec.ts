import { IdentityDataProtectorAdapter } from '../../../src/platform/security/identity-data-protector.adapter';
import { AesGcmPersonalDataCipher } from '../../../src/platform/security/personal-data-cipher';

describe('identity data protector', () => {
  const protector = new IdentityDataProtectorAdapter(
    new AesGcmPersonalDataCipher('test-personal-data-secret'),
  );

  it('encrypts reversible display values and creates stable matching hashes', () => {
    const first = protector.protectPhoneNumber('010-1234-5678');
    const second = protector.protectPhoneNumber('+82 10 1234 5678');

    expect(first.encryptedValue).not.toContain('010-1234-5678');
    expect(protector.reveal(first.encryptedValue)).toBe('010-1234-5678');
    expect(second.hash).toBe(first.hash);
    expect(second.encryptedValue).not.toBe(first.encryptedValue);
  });

  it('rejects invalid birth dates before persistence', () => {
    expect(() => protector.protectBirthDate('2026-02-30')).toThrow(
      'birth date must be valid',
    );
  });
});
