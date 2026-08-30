import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
} from 'node:crypto';

const CIPHER_VERSION = 'v1';
const IV_BYTES = 12;

export interface PersonalDataCipher {
  decrypt(ciphertext: string): string;
  encrypt(plaintext: string): string;
  hash(plaintext: string): string;
}

export class AesGcmPersonalDataCipher implements PersonalDataCipher {
  private readonly encryptionKey: Buffer;
  private readonly hashKey: Buffer;

  constructor(secret: string) {
    if (secret.trim().length === 0) {
      throw new Error('personal data encryption secret must not be empty');
    }

    const rootKey = createHash('sha256').update(secret).digest();
    this.encryptionKey = createHmac('sha256', rootKey)
      .update('elector-personal-data-encryption')
      .digest();
    this.hashKey = createHmac('sha256', rootKey)
      .update('elector-personal-data-hash')
      .digest();
  }

  encrypt(plaintext: string): string {
    const iv = randomBytes(IV_BYTES);
    const cipher = createCipheriv('aes-256-gcm', this.encryptionKey, iv);
    const ciphertext = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();

    return [
      CIPHER_VERSION,
      iv.toString('base64url'),
      authTag.toString('base64url'),
      ciphertext.toString('base64url'),
    ].join(':');
  }

  decrypt(ciphertext: string): string {
    const [version, iv, authTag, encryptedValue] = ciphertext.split(':');
    if (
      version !== CIPHER_VERSION ||
      iv === undefined ||
      authTag === undefined ||
      encryptedValue === undefined
    ) {
      throw new Error('invalid personal data ciphertext');
    }

    const decipher = createDecipheriv(
      'aes-256-gcm',
      this.encryptionKey,
      Buffer.from(iv, 'base64url'),
    );
    decipher.setAuthTag(Buffer.from(authTag, 'base64url'));

    return Buffer.concat([
      decipher.update(Buffer.from(encryptedValue, 'base64url')),
      decipher.final(),
    ]).toString('utf8');
  }

  hash(plaintext: string): string {
    return createHmac('sha256', this.hashKey)
      .update(normalizePersonalDataForHash(plaintext))
      .digest('hex');
  }
}

export function isPersonalDataCiphertext(value: string): boolean {
  return value.startsWith(`${CIPHER_VERSION}:`);
}

function normalizePersonalDataForHash(value: string): string {
  return value.trim().toLowerCase();
}
