import type {
  IdentityDataProtectorPort,
  ProtectedIdentityData,
} from '../../shared/application/port/security/identity-data-protector.port';
import type { PersonalDataCipher } from './personal-data-cipher';

export class IdentityDataProtectorAdapter implements IdentityDataProtectorPort {
  constructor(private readonly cipher: PersonalDataCipher) {}

  protectName(value: string): ProtectedIdentityData {
    const normalized = normalizeName(value);
    return this.protect(normalized, normalized);
  }

  protectPhoneNumber(value: string): ProtectedIdentityData {
    const displayValue = value.trim();
    return this.protect(displayValue, normalizePhoneNumber(displayValue));
  }

  protectBirthDate(value: string): ProtectedIdentityData {
    const normalized = normalizeBirthDate(value);
    return this.protect(normalized, normalized);
  }

  reveal(encryptedValue: string): string {
    return this.cipher.decrypt(encryptedValue);
  }

  private protect(value: string, hashInput: string): ProtectedIdentityData {
    return {
      encryptedValue: this.cipher.encrypt(value),
      hash: this.cipher.hash(hashInput),
    };
  }
}

function normalizeName(value: string): string {
  const normalized = value.normalize('NFC').trim().replace(/\s+/g, ' ');
  if (normalized.length === 0) {
    throw new TypeError('identity name must not be empty');
  }
  return normalized;
}

function normalizePhoneNumber(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.length < 8 || digits.length > 15) {
    throw new TypeError('identity phone number must contain 8 to 15 digits');
  }

  return digits.startsWith('82') ? `0${digits.slice(2)}` : digits;
}

function normalizeBirthDate(value: string): string {
  const normalized = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    throw new TypeError('identity birth date must use YYYY-MM-DD');
  }

  const parsed = new Date(`${normalized}T00:00:00.000Z`);
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== normalized
  ) {
    throw new TypeError('identity birth date must be valid');
  }
  return normalized;
}
