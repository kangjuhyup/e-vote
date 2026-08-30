import { getEncryptedPersonalDataFields } from './encrypted-personal-data.decorator';
import {
  isPersonalDataCiphertext,
  PersonalDataCipher,
} from './personal-data-cipher';

export function encryptDecoratedPersonalData<T extends object>(
  value: T,
  cipher: PersonalDataCipher,
): T {
  const output = { ...value } as Record<string, unknown>;

  for (const field of getEncryptedPersonalDataFields(value)) {
    const currentValue = output[field.propertyKey];

    if (typeof currentValue === 'string') {
      output[field.propertyKey] = cipher.encrypt(currentValue);

      if (field.hashProperty !== undefined) {
        output[field.hashProperty] = cipher.hash(currentValue);
      }
      continue;
    }

    if (field.hashProperty !== undefined) {
      output[field.hashProperty] = null;
    }
  }

  return output as T;
}

export function decryptDecoratedPersonalData<T extends object>(
  value: T,
  cipher: PersonalDataCipher,
): T {
  const output = { ...value } as Record<string, unknown>;

  for (const field of getEncryptedPersonalDataFields(value)) {
    const currentValue = output[field.propertyKey];

    if (
      typeof currentValue === 'string' &&
      isPersonalDataCiphertext(currentValue)
    ) {
      output[field.propertyKey] = cipher.decrypt(currentValue);
    }
  }

  return output as T;
}
