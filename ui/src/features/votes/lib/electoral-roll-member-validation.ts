import type {
  ElectoralRollMemberDraft,
  ElectoralRollMemberRecord,
  UpdateElectoralRollMemberInput,
} from '../model/electoral-roll.types';

type IdentityProfile = Pick<
  ElectoralRollMemberDraft,
  'birthDate' | 'name' | 'phoneNumber'
>;

export type ElectoralRollMemberIdentityPatch = Pick<
  UpdateElectoralRollMemberInput,
  'birthDate' | 'name' | 'phoneNumber'
>;

function optionalTrimmed(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export function countPhoneNumberDigits(value: string) {
  return value.replace(/\D/g, '').length;
}

export function isValidBirthDate(value: string) {
  const normalized = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return false;
  const parsed = new Date(`${normalized}T00:00:00.000Z`);
  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === normalized
  );
}

export function hasMaskedPersonalData(value?: string) {
  return value?.includes('*') ?? false;
}

export function validateElectoralRollMemberIdentity(
  member: IdentityProfile,
  source?: Pick<
    ElectoralRollMemberRecord,
    'birthDate' | 'name' | 'phoneNumber'
  >,
): string | undefined {
  const name = optionalTrimmed(member.name);
  const phoneNumber = optionalTrimmed(member.phoneNumber);
  const birthDate = optionalTrimmed(member.birthDate);
  const sourceName = optionalTrimmed(source?.name);
  const sourcePhoneNumber = optionalTrimmed(source?.phoneNumber);
  const sourceBirthDate = optionalTrimmed(source?.birthDate);
  const identityChanged =
    name !== sourceName || phoneNumber !== sourcePhoneNumber;
  const birthDateChanged = birthDate !== sourceBirthDate;
  const identityProfileChanged = identityChanged || birthDateChanged;

  if (!identityChanged && !birthDateChanged) return undefined;

  if (Boolean(name) !== Boolean(phoneNumber)) {
    return '이름과 휴대폰번호는 함께 입력하세요.';
  }

  if (identityChanged && sourceName && sourcePhoneNumber && !name && !phoneNumber) {
    return '등록된 이름과 휴대폰번호는 빈 값으로 삭제할 수 없습니다.';
  }

  if (
    identityProfileChanged &&
    (hasMaskedPersonalData(name) || hasMaskedPersonalData(phoneNumber))
  ) {
    return '본인인증 정보를 변경하려면 이름과 휴대폰번호를 모두 다시 입력하세요.';
  }

  if (identityProfileChanged && phoneNumber) {
    const digitCount = countPhoneNumberDigits(phoneNumber);
    if (digitCount < 8 || digitCount > 15) {
      return '휴대폰번호는 표시 문자를 제외하고 숫자 8~15자리로 입력하세요.';
    }
  }

  const hasIdentityProfile = Boolean(
    identityChanged ? name && phoneNumber : sourceName && sourcePhoneNumber,
  );
  if (birthDateChanged && sourceBirthDate && !birthDate) {
    return '등록된 생년월일은 빈 값으로 삭제할 수 없습니다.';
  }
  if (birthDate && !hasIdentityProfile) {
    return '생년월일은 이름과 휴대폰번호를 함께 입력한 경우에만 입력할 수 있습니다.';
  }

  if (
    birthDateChanged &&
    birthDate &&
    (hasMaskedPersonalData(birthDate) || !isValidBirthDate(birthDate))
  ) {
    return '생년월일은 유효한 YYYY-MM-DD 형식으로 입력하세요.';
  }
}

export function getElectoralRollMemberIdentityPatch(
  source: Pick<
    ElectoralRollMemberRecord,
    'birthDate' | 'name' | 'phoneNumber'
  >,
  draft: IdentityProfile,
): ElectoralRollMemberIdentityPatch {
  const patch: ElectoralRollMemberIdentityPatch = {};
  const name = optionalTrimmed(draft.name);
  const phoneNumber = optionalTrimmed(draft.phoneNumber);
  const birthDate = optionalTrimmed(draft.birthDate);
  const birthDateChanged = birthDate !== optionalTrimmed(source.birthDate);

  if (
    name !== optionalTrimmed(source.name) ||
    phoneNumber !== optionalTrimmed(source.phoneNumber) ||
    birthDateChanged
  ) {
    patch.name = name;
    patch.phoneNumber = phoneNumber;
  }
  if (birthDateChanged) {
    patch.birthDate = birthDate;
  }

  return patch;
}
