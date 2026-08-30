import {
  getMaskedPersonalDataFields,
  PersonalDataMaskingStrategy,
} from '../decorator/masked-personal-data.decorator';

export function maskDecoratedPersonalData<T>(value: T): T {
  return maskValue(value, new WeakSet<object>()) as T;
}

export function maskPersonalData(
  value: string,
  strategy: PersonalDataMaskingStrategy,
): string {
  if (strategy === 'birthDate') {
    return maskBirthDate(value);
  }

  if (strategy === 'name') {
    return maskName(value);
  }

  if (strategy === 'phoneNumber') {
    return maskPhoneNumber(value);
  }

  return maskDefault(value);
}

function maskValue(value: unknown, seen: WeakSet<object>): unknown {
  if (value == undefined || typeof value !== 'object') {
    return value;
  }

  if (value instanceof Date) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => maskValue(item, seen));
  }

  if (seen.has(value)) {
    return value;
  }
  seen.add(value);

  const output: Record<string, unknown> = {};
  for (const [key, nestedValue] of Object.entries(value)) {
    output[key] = maskValue(nestedValue, seen);
  }

  for (const field of getMaskedPersonalDataFields(value)) {
    const currentValue = output[field.propertyKey];
    if (typeof currentValue === 'string') {
      output[field.propertyKey] = maskPersonalData(
        currentValue,
        field.strategy,
      );
    }
  }

  return output;
}

function maskName(value: string): string {
  const characters = Array.from(value);

  if (characters.length === 0) {
    return value;
  }

  if (characters.length === 1) {
    return '*';
  }

  if (characters.length === 2) {
    return `${characters[0]}*`;
  }

  return `${characters[0]}${'*'.repeat(characters.length - 2)}${
    characters[characters.length - 1]
  }`;
}

function maskPhoneNumber(value: string): string {
  const digits = Array.from(value).filter((character) =>
    isDigit(character),
  ).length;

  if (digits <= 4) {
    return Array.from(value)
      .map((character) => (isDigit(character) ? '*' : character))
      .join('');
  }

  let digitIndex = 0;

  return Array.from(value)
    .map((character) => {
      if (!isDigit(character)) {
        return character;
      }

      const shouldShow = digitIndex < 3 || digitIndex >= digits - 4;
      digitIndex += 1;

      return shouldShow ? character : '*';
    })
    .join('');
}

function maskBirthDate(value: string): string {
  const digits = value.replace(/\D/g, '');

  if (digits.length >= 8) {
    return `${digits.slice(0, 4)}-**-**`;
  }

  if (digits.length > 4) {
    return `${digits.slice(0, 4)}${'*'.repeat(digits.length - 4)}`;
  }

  return maskDefault(value);
}

function maskDefault(value: string): string {
  const characters = Array.from(value);

  if (characters.length <= 2) {
    return '*'.repeat(characters.length);
  }

  return `${characters[0]}${'*'.repeat(characters.length - 2)}${
    characters[characters.length - 1]
  }`;
}

function isDigit(value: string): boolean {
  return /^[0-9]$/.test(value);
}
