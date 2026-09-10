const KOREAN_MOBILE_PATTERN = /^010\d{8}$/;

function toDomesticDigits(value: string) {
  const digits = value.replace(/\D/g, '');
  if (digits.startsWith('82010')) return digits.slice(2);
  if (digits.startsWith('8210')) return `0${digits.slice(2)}`;
  return digits;
}

export function formatKoreanMobileNumber(value: string) {
  const digits = toDomesticDigits(value).slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

export function toAuthKoreanMobileNumber(value: string) {
  const digits = toDomesticDigits(value);
  return KOREAN_MOBILE_PATTERN.test(digits)
    ? `+82${digits}`
    : undefined;
}
