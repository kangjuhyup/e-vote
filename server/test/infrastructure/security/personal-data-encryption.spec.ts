import { EncryptedPersonalData } from '../../../src/platform/security/encrypted-personal-data.decorator';
import {
  decryptDecoratedPersonalData,
  encryptDecoratedPersonalData,
} from '../../../src/platform/security/encrypted-personal-data-transformer';
import {
  AesGcmPersonalDataCipher,
  PersonalDataCipher,
} from '../../../src/platform/security/personal-data-cipher';

class ElectorPersonalDataFixture {
  @EncryptedPersonalData()
  readonly name: string;

  @EncryptedPersonalData({ hashProperty: 'phoneNumberHash' })
  readonly phoneNumber: string | null;

  readonly phoneNumberHash: string | null;

  constructor(name: string, phoneNumber: string | null) {
    this.name = name;
    this.phoneNumber = phoneNumber;
    this.phoneNumberHash = null;
  }
}

describe('personal data encryption decorators', () => {
  it('encrypts decorated fields and writes configured hash fields', () => {
    const cipher: PersonalDataCipher = {
      encrypt: (plaintext) => `encrypted:${plaintext}`,
      decrypt: (ciphertext) => ciphertext.replace('encrypted:', ''),
      hash: (plaintext) => `hash:${plaintext}`,
    };

    const encrypted = encryptDecoratedPersonalData(
      new ElectorPersonalDataFixture('Kim Min Su', '010-1234-5678'),
      cipher,
    );

    expect(encrypted).toEqual({
      name: 'encrypted:Kim Min Su',
      phoneNumber: 'encrypted:010-1234-5678',
      phoneNumberHash: 'hash:010-1234-5678',
    });
  });

  it('round-trips AES-GCM ciphertext without storing raw values', () => {
    const cipher = new AesGcmPersonalDataCipher(
      'test-only-personal-data-secret',
    );
    const encrypted = encryptDecoratedPersonalData(
      new ElectorPersonalDataFixture('Kim Min Su', '010-1234-5678'),
      cipher,
    );

    expect(encrypted.name).not.toContain('Kim Min Su');
    expect(encrypted.phoneNumber).not.toContain('010-1234-5678');
    expect(encrypted.phoneNumberHash).toHaveLength(64);

    const decrypted = decryptDecoratedPersonalData(
      new ElectorPersonalDataFixture(encrypted.name, encrypted.phoneNumber),
      cipher,
    );

    expect(decrypted.name).toBe('Kim Min Su');
    expect(decrypted.phoneNumber).toBe('010-1234-5678');
  });
});
