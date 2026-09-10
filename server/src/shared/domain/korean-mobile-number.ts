const KOREAN_MOBILE_E164_PATTERN = /^\+8210\d{8}$/;
const KOREAN_MOBILE_DOMESTIC_PATTERN = /^010\d{8}$/;

export function normalizeKoreanMobileNumber(value: string): string {
  const trimmed = value.trim();
  if (KOREAN_MOBILE_E164_PATTERN.test(trimmed)) return trimmed;

  const digits = trimmed.replace(/\D/g, '');
  if (KOREAN_MOBILE_DOMESTIC_PATTERN.test(digits)) {
    return `+82${digits.slice(1)}`;
  }
  throw new TypeError('phone number must be a Korean 010 mobile number');
}
