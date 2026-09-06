import { describe, expect, it } from 'vitest';

import {
  getElectoralRollMemberIdentityPatch,
  isValidBirthDate,
  validateElectoralRollMemberIdentity,
} from '@/features/votes/lib/electoral-roll-member-validation';

describe('electoral roll member identity validation', () => {
  it('keeps identity fields optional when all three are omitted', () => {
    expect(validateElectoralRollMemberIdentity({})).toBeUndefined();
  });

  it('requires name and phone number together', () => {
    expect(
      validateElectoralRollMemberIdentity({ name: '김선거' }),
    ).toBe('이름과 휴대폰번호는 함께 입력하세요.');
  });

  it('counts phone digits after removing display characters', () => {
    expect(
      validateElectoralRollMemberIdentity({
        name: '김선거',
        phoneNumber: '010 1234-5678',
      }),
    ).toBeUndefined();
    expect(
      validateElectoralRollMemberIdentity({
        name: '김선거',
        phoneNumber: '123-4567',
      }),
    ).toBe(
      '휴대폰번호는 표시 문자를 제외하고 숫자 8~15자리로 입력하세요.',
    );
  });

  it('accepts only real YYYY-MM-DD dates with a complete identity profile', () => {
    expect(isValidBirthDate('2000-02-29')).toBe(true);
    expect(isValidBirthDate('2001-02-29')).toBe(false);
    expect(isValidBirthDate('2000-2-29')).toBe(false);
    expect(
      validateElectoralRollMemberIdentity({ birthDate: '1990-01-01' }),
    ).toBe(
      '생년월일은 이름과 휴대폰번호를 함께 입력한 경우에만 입력할 수 있습니다.',
    );
  });

  it('preserves unchanged masks and never includes them in an update patch', () => {
    const source = {
      birthDate: '1990-**-**',
      name: '김*표',
      phoneNumber: '010-****-1201',
    };

    expect(validateElectoralRollMemberIdentity(source, source)).toBeUndefined();
    expect(getElectoralRollMemberIdentityPatch(source, source)).toEqual({});
  });

  it('requires both raw identity values when replacing a masked profile', () => {
    const source = {
      birthDate: '1990-**-**',
      name: '김*표',
      phoneNumber: '010-****-1201',
    };
    const draft = { ...source, name: '김대표' };

    expect(validateElectoralRollMemberIdentity(draft, source)).toBe(
      '본인인증 정보를 변경하려면 이름과 휴대폰번호를 모두 다시 입력하세요.',
    );
  });

  it('requires raw name and phone values when changing a masked birth date', () => {
    const source = {
      birthDate: '1990-**-**',
      name: '김*표',
      phoneNumber: '010-****-1201',
    };
    const draft = { ...source, birthDate: '1991-02-03' };

    expect(validateElectoralRollMemberIdentity(draft, source)).toBe(
      '본인인증 정보를 변경하려면 이름과 휴대폰번호를 모두 다시 입력하세요.',
    );
    const rawDraft = {
      birthDate: '1991-02-03',
      name: '김대표',
      phoneNumber: '010-1234-1201',
    };
    expect(validateElectoralRollMemberIdentity(rawDraft, source)).toBeUndefined();
    expect(getElectoralRollMemberIdentityPatch(source, rawDraft)).toEqual({
      birthDate: '1991-02-03',
      name: '김대표',
      phoneNumber: '010-1234-1201',
    });
  });
});
