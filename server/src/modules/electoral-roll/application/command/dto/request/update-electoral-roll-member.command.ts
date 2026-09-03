import { InvalidElectoralRollMemberIdentityDataError } from '../../electoral-roll.error';

export class UpdateElectoralRollMemberCommand {
  private constructor(
    readonly userPrincipalId: string,
    readonly electoralRollId: string,
    readonly memberId: string,
    readonly identifier: string,
    readonly groupKey: string | undefined,
    readonly voteWeight: number,
    readonly name: string | undefined,
    readonly phoneNumber: string | undefined,
    readonly birthDate: string | undefined,
    readonly changedAt: Date,
  ) {}

  static of(params: {
    readonly userPrincipalId: string;
    readonly electoralRollId: string;
    readonly memberId: string;
    readonly identifier: string;
    readonly groupKey?: string;
    readonly voteWeight: number;
    readonly name?: string;
    readonly phoneNumber?: string;
    readonly birthDate?: string;
    readonly changedAt: Date;
  }): UpdateElectoralRollMemberCommand {
    if ((params.name === undefined) !== (params.phoneNumber === undefined)) {
      throw new InvalidElectoralRollMemberIdentityDataError(
        'electoral roll member name and phoneNumber must be provided together',
      );
    }
    if (params.name !== undefined && params.name.trim().length === 0) {
      throw new InvalidElectoralRollMemberIdentityDataError(
        'electoral roll member name must not be empty',
      );
    }
    if (
      params.phoneNumber !== undefined &&
      !hasValidPhoneNumber(params.phoneNumber)
    ) {
      throw new InvalidElectoralRollMemberIdentityDataError(
        'electoral roll member phoneNumber must contain 8 to 15 digits',
      );
    }
    if (
      params.birthDate !== undefined &&
      !hasValidBirthDate(params.birthDate)
    ) {
      throw new InvalidElectoralRollMemberIdentityDataError(
        'electoral roll member birthDate must be a valid YYYY-MM-DD date',
      );
    }

    return new UpdateElectoralRollMemberCommand(
      params.userPrincipalId,
      params.electoralRollId,
      params.memberId,
      params.identifier,
      params.groupKey,
      params.voteWeight,
      params.name,
      params.phoneNumber,
      params.birthDate,
      params.changedAt,
    );
  }
}

function hasValidPhoneNumber(value: string): boolean {
  const digitCount = value.replace(/\D/g, '').length;
  return digitCount >= 8 && digitCount <= 15;
}

function hasValidBirthDate(value: string): boolean {
  const normalized = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return false;
  const parsed = new Date(`${normalized}T00:00:00.000Z`);
  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === normalized
  );
}
