const KOREAN_MOBILE_DOMESTIC_PATTERN = /^010\d{8}$/;

export function normalizeKoreanMobileNumber(value: string): string {
  const domestic = toDomesticDigits(value);
  if (domestic) return `+82${domestic}`;
  throw new TypeError('phone number must be a Korean 010 mobile number');
}

export function koreanMobileNumberAliases(value: string): string[] {
  const domestic = toDomesticDigits(value);
  if (!domestic) return [];
  return [`+82${domestic}`, `+82${domestic.slice(1)}`, domestic];
}

function toDomesticDigits(value: string): string | undefined {
  const digits = value.trim().replace(/\D/g, '');
  const domestic = digits.startsWith('82010')
    ? digits.slice(2)
    : digits.startsWith('8210')
      ? `0${digits.slice(2)}`
      : digits;
  return KOREAN_MOBILE_DOMESTIC_PATTERN.test(domestic) ? domestic : undefined;
}
